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


class TestNearestRainfall:
    def test_empty_weather_returns_false(self):
        empty = pd.DataFrame(columns=["Time", "Rainfall"])
        assert collect.nearest_rainfall(empty, pd.Timedelta(seconds=10)) is False

    def test_nat_lap_time_returns_false(self):
        weather = pd.DataFrame({"Time": [pd.Timedelta(seconds=0)], "Rainfall": [True]})
        assert collect.nearest_rainfall(weather, pd.NaT) is False

    def test_picks_the_nearest_sample_by_time(self):
        weather = pd.DataFrame({
            "Time": [pd.Timedelta(seconds=0), pd.Timedelta(seconds=60), pd.Timedelta(seconds=120)],
            "Rainfall": [False, True, False],
        })
        assert collect.nearest_rainfall(weather, pd.Timedelta(seconds=61)) is True
        assert collect.nearest_rainfall(weather, pd.Timedelta(seconds=1)) is False


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
