"""
Unit tests for collect.py's pure helper functions — no network, no FastF1 session load.

Run with: .venv/bin/pytest test_collect.py -v

Deliberately does NOT test `collect_qualifying`/`collect_race`/`main` end-to-end, since those
call `fastf1.get_session(...).load(...)`, which downloads real session data over the network.
Those two functions are exercised instead by the TypeScript side's real-shaped fixture tests
(`backend/src/f1rating/__tests__/fastF1Ingestion.test.ts`), which consume output this script
already produced and committed to `output/`.
"""
import datetime

import pandas as pd
import pytest

import collect


class TestMapCompound:
    def test_known_compounds_map_to_lowercase(self):
        assert collect.map_compound("SOFT") == "soft"
        assert collect.map_compound("MEDIUM") == "medium"
        assert collect.map_compound("HARD") == "hard"
        assert collect.map_compound("INTERMEDIATE") == "intermediate"
        assert collect.map_compound("WET") == "wet"

    def test_unknown_compound_defaults_to_medium_with_a_warning(self, capsys):
        assert collect.map_compound("TEST_UNKNOWN") == "medium"
        captured = capsys.readouterr()
        assert "unknown compound" in captured.err


class TestMapTrackStatus:
    def test_plain_green(self):
        assert collect.map_track_status("1") == "green"

    def test_safety_car_digit_takes_priority_over_yellow(self):
        # FastF1 concatenates multiple statuses that occurred during a lap, e.g. "124" = clear+yellow+SC
        assert collect.map_track_status("124") == "sc"

    def test_red_flag_takes_priority_over_everything_else(self):
        assert collect.map_track_status("145") == "red"
        assert collect.map_track_status("5") == "red"

    def test_vsc_digits(self):
        assert collect.map_track_status("6") == "vsc"
        assert collect.map_track_status("7") == "vsc"
        assert collect.map_track_status("17") == "vsc"

    def test_none_or_empty_defaults_to_green(self):
        assert collect.map_track_status(None) == "green"
        assert collect.map_track_status("") == "green"

    def test_combined_status_preserves_the_highest_severity_reading(self):
        # A lap that was green, then went yellow, then SC, then back to green ("1214") — SC (4) wins.
        assert collect.map_track_status("1214") == "sc"


class TestMs:
    def test_none_stays_none(self):
        assert collect.ms(None) is None

    def test_nat_stays_none(self):
        assert collect.ms(pd.NaT) is None

    def test_converts_timedelta_to_milliseconds(self):
        td = datetime.timedelta(minutes=1, seconds=26, milliseconds=995)
        assert collect.ms(td) == 86_995


class TestFormatErgastTime:
    def test_none_stays_none(self):
        assert collect.format_ergast_time(None) is None

    def test_nat_stays_none(self):
        assert collect.format_ergast_time(pd.NaT) is None

    def test_formats_matching_real_observed_ergast_style(self):
        td = datetime.timedelta(minutes=1, seconds=26, milliseconds=995)
        assert collect.format_ergast_time(td) == "1:26.995"

    def test_sub_minute_time_still_includes_minutes_component(self):
        td = datetime.timedelta(seconds=59, milliseconds=1)
        assert collect.format_ergast_time(td) == "0:59.001"


class TestClassifyLapCondition:
    """`classify_lap_condition` combines a weather (rainfall) signal with a compound-implied
    signal — see its docstring for the full rule set. Tests use SOFT for a dry-implying compound
    and INTERMEDIATE for a wet-implying one, per `WET_IMPLYING_COMPOUNDS`.
    """

    def test_empty_weather_is_uncertain_not_dry(self):
        # No data to measure -> uncertain. Never silently defaults to "dry".
        empty = pd.DataFrame(columns=["Time", "Rainfall"])
        assert collect.classify_lap_condition(empty, pd.Timedelta(seconds=10), "SOFT") == "uncertain"

    def test_nat_lap_time_is_uncertain(self):
        weather = pd.DataFrame({"Time": [pd.Timedelta(seconds=0)], "Rainfall": [True]})
        assert collect.classify_lap_condition(weather, pd.NaT, "SOFT") == "uncertain"

    def test_dry_slick_lap_with_confidently_dry_weather_is_dry(self):
        weather = pd.DataFrame({
            "Time": [pd.Timedelta(seconds=0), pd.Timedelta(seconds=60), pd.Timedelta(seconds=120)],
            "Rainfall": [False, False, False],
        })
        assert collect.classify_lap_condition(weather, pd.Timedelta(seconds=60), "MEDIUM") == "dry"

    def test_wet_compound_with_confidently_wet_weather_is_wet(self):
        weather = pd.DataFrame({
            "Time": [pd.Timedelta(seconds=0), pd.Timedelta(seconds=60), pd.Timedelta(seconds=120)],
            "Rainfall": [True, True, True],
        })
        assert collect.classify_lap_condition(weather, pd.Timedelta(seconds=60), "WET") == "wet"

    def test_intermediate_compound_with_confidently_wet_weather_is_wet(self):
        weather = pd.DataFrame({"Time": [pd.Timedelta(seconds=0)], "Rainfall": [True]})
        assert collect.classify_lap_condition(weather, pd.Timedelta(seconds=0), "INTERMEDIATE") == "wet"

    def test_intermediate_on_a_confidently_dry_sensor_is_uncertain_not_dry(self):
        # Real 2025 case Jonny flagged: driver still on inters after the rain sensor reads dry —
        # a genuine crossover lap, not something to guess into "dry" just because the sensor says so.
        weather = pd.DataFrame({
            "Time": [pd.Timedelta(seconds=0), pd.Timedelta(seconds=60), pd.Timedelta(seconds=120)],
            "Rainfall": [False, False, False],
        })
        assert collect.classify_lap_condition(weather, pd.Timedelta(seconds=60), "INTERMEDIATE") == "uncertain"

    def test_slick_on_a_confidently_wet_sensor_is_uncertain_not_wet(self):
        weather = pd.DataFrame({
            "Time": [pd.Timedelta(seconds=0), pd.Timedelta(seconds=60), pd.Timedelta(seconds=120)],
            "Rainfall": [True, True, True],
        })
        assert collect.classify_lap_condition(weather, pd.Timedelta(seconds=60), "SOFT") == "uncertain"

    def test_ambiguous_weather_window_is_uncertain_regardless_of_compound(self):
        # Window straddles a real transition (roughly half rain, half not) -> weather signal
        # itself is ambiguous, so the lap is uncertain even if compound would otherwise agree
        # with one interpretation.
        weather = pd.DataFrame({
            "Time": [pd.Timedelta(seconds=0), pd.Timedelta(seconds=60)],
            "Rainfall": [True, False],
        })
        assert collect.classify_lap_condition(weather, pd.Timedelta(seconds=30), "MEDIUM") == "uncertain"

    def test_uses_majority_vote_within_the_window_not_a_single_nearest_sample(self):
        # 9 samples within the ±90s window around t=61, only ONE (t=60, the single nearest
        # sample) is wet -> rain fraction 1/9 ≈ 0.11, confidently dry (<= the 0.2 dry band),
        # agreeing with the slick compound. The old single-nearest-sample lookup would have
        # flip-flopped to "wet" here since t=60 is the closest sample to t=61.
        times = [0, 15, 30, 45, 60, 75, 90, 105, 120]
        weather = pd.DataFrame({
            "Time": [pd.Timedelta(seconds=t) for t in times],
            "Rainfall": [t == 60 for t in times],
        })
        assert collect.classify_lap_condition(weather, pd.Timedelta(seconds=61), "MEDIUM", window_seconds=90) == "dry"

    def test_is_deterministic_for_the_same_inputs(self):
        weather = pd.DataFrame({"Time": [pd.Timedelta(seconds=0)], "Rainfall": [False]})
        a = collect.classify_lap_condition(weather, pd.Timedelta(seconds=0), "SOFT")
        b = collect.classify_lap_condition(weather, pd.Timedelta(seconds=0), "SOFT")
        assert a == b == "dry"


class TestWeatherRainFraction:
    def test_none_for_empty_weather(self):
        empty = pd.DataFrame(columns=["Time", "Rainfall"])
        assert collect._weather_rain_fraction(empty, pd.Timedelta(seconds=10), 90) is None

    def test_none_for_nat_lap_time(self):
        weather = pd.DataFrame({"Time": [pd.Timedelta(seconds=0)], "Rainfall": [True]})
        assert collect._weather_rain_fraction(weather, pd.NaT, 90) is None

    def test_falls_back_to_nearest_sample_when_window_is_empty(self):
        weather = pd.DataFrame({"Time": [pd.Timedelta(seconds=10_000)], "Rainfall": [True]})
        assert collect._weather_rain_fraction(weather, pd.Timedelta(seconds=0), 90) == 1.0


class TestParseDriverCodes:
    def test_uppercases_and_trims(self):
        assert collect.parse_driver_codes(" nor, pia ") == ["NOR", "PIA"]

    def test_ignores_empty_segments(self):
        assert collect.parse_driver_codes("NOR,,PIA,") == ["NOR", "PIA"]


class TestArgParser:
    def test_missing_required_arguments_exits_non_zero(self):
        parser = collect.build_arg_parser()
        with pytest.raises(SystemExit) as excinfo:
            parser.parse_args([])
        assert excinfo.value.code != 0

    def test_valid_arguments_parse_successfully(self):
        parser = collect.build_arg_parser()
        args = parser.parse_args(["--season", "2025", "--round", "3", "--drivers", "NOR,PIA"])
        assert args.season == 2025
        assert args.round == 3
        assert args.drivers == "NOR,PIA"
        assert args.cache == "cache"  # default
        assert args.out == "output"  # default


class TestSchemaVersionStability:
    def test_schema_version_is_the_documented_stable_string(self):
        # Must match `SUPPORTED_SCHEMA_VERSION` in backend/src/f1rating/adapters/fastF1Adapter.ts —
        # there is no automated cross-language check for this, so both sides carry a code comment
        # pointing at each other; this test just pins the Python side against accidental drift.
        assert collect.SCHEMA_VERSION == "fastf1-export-v1"
