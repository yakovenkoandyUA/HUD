"""
Unit tests for batch_collect.py's pure/file-system helper functions — no live network, no
`fastf1.get_session(...).load(...)` calls (that's exercised by the real collection run itself,
recorded as `output_grid/collection-summary-2025.json`, not by this suite).

Run with: .venv/bin/pytest test_batch_collect.py -v
"""
import json

import pytest

import batch_collect
import collect


class TestParseRoundSpec:
    def test_comma_separated_list(self):
        assert batch_collect.parse_round_spec("1,4,7") == [1, 4, 7]

    def test_range_syntax(self):
        assert batch_collect.parse_round_spec("1-5") == [1, 2, 3, 4, 5]

    def test_mixed_list_and_range(self):
        assert batch_collect.parse_round_spec("1-3,7,10-12") == [1, 2, 3, 7, 10, 11, 12]

    def test_deduplicates_and_sorts(self):
        assert batch_collect.parse_round_spec("5,1,1,3-5") == [1, 3, 4, 5]

    def test_ignores_empty_segments(self):
        assert batch_collect.parse_round_spec("1,,4,") == [1, 4]

    def test_single_round(self):
        assert batch_collect.parse_round_spec("7") == [7]


class TestExistingExportIsValid:
    def test_nonexistent_file_is_invalid(self, tmp_path):
        assert batch_collect.existing_export_is_valid(tmp_path / "missing.json") is False

    def test_malformed_json_is_invalid(self, tmp_path):
        path = tmp_path / "bad.json"
        path.write_text("{not valid json")
        assert batch_collect.existing_export_is_valid(path) is False

    def test_wrong_schema_version_is_invalid(self, tmp_path):
        path = tmp_path / "wrong_schema.json"
        path.write_text(json.dumps({"schemaVersion": "other-v1", "qualifying": [{}], "race": [{}]}))
        assert batch_collect.existing_export_is_valid(path) is False

    def test_empty_qualifying_is_invalid(self, tmp_path):
        path = tmp_path / "empty_q.json"
        path.write_text(json.dumps({"schemaVersion": collect.SCHEMA_VERSION, "qualifying": [], "race": [{}]}))
        assert batch_collect.existing_export_is_valid(path) is False

    def test_empty_race_is_invalid(self, tmp_path):
        path = tmp_path / "empty_r.json"
        path.write_text(json.dumps({"schemaVersion": collect.SCHEMA_VERSION, "qualifying": [{}], "race": []}))
        assert batch_collect.existing_export_is_valid(path) is False

    def test_well_formed_export_is_valid(self, tmp_path):
        path = tmp_path / "good.json"
        path.write_text(json.dumps({"schemaVersion": collect.SCHEMA_VERSION, "qualifying": [{}], "race": [{}]}))
        assert batch_collect.existing_export_is_valid(path) is True


class TestCollectOneRoundResumability:
    def test_skips_existing_valid_export_by_default(self, tmp_path):
        out_dir = tmp_path
        existing = out_dir / "2025_01.json"
        existing.write_text(json.dumps({
            "schemaVersion": collect.SCHEMA_VERSION,
            "qualifying": [{"driverId": "norris", "constructorId": "mclaren", "position": "1", "Q1": None, "Q2": None, "Q3": None}],
            "race": [{"driverId": "norris", "constructorId": "mclaren"}],
        }))
        record = batch_collect.collect_one_round(2025, 1, out_dir, force=False)
        assert record["status"] == "skipped-existing"
        assert record["driverCount"] == 1

    def test_force_ignores_existing_export_and_attempts_recollection(self, tmp_path, monkeypatch):
        out_dir = tmp_path
        existing = out_dir / "2025_01.json"
        existing.write_text(json.dumps({
            "schemaVersion": collect.SCHEMA_VERSION,
            "qualifying": [{}], "race": [{}],
        }))

        def fake_collect_round(season, round_no, driver_codes=None):
            raise RuntimeError("simulated network failure — proves --force actually re-attempted collection")

        monkeypatch.setattr(collect, "collect_round", fake_collect_round)
        record = batch_collect.collect_one_round(2025, 1, out_dir, force=True)
        assert record["status"] == "failed"
        assert "simulated network failure" in record["error"]

    def test_no_infinite_retry_exactly_one_attempt_per_round(self, tmp_path, monkeypatch):
        call_count = {"n": 0}

        def fake_collect_round(season, round_no, driver_codes=None):
            call_count["n"] += 1
            raise RuntimeError("boom")

        monkeypatch.setattr(collect, "collect_round", fake_collect_round)
        batch_collect.collect_one_round(2025, 1, tmp_path, force=False)
        assert call_count["n"] == 1

    def test_unavailable_session_error_is_classified_distinctly_from_generic_failure(self, tmp_path, monkeypatch):
        def fake_collect_round(season, round_no, driver_codes=None):
            raise RuntimeError("The session does not exist for this event")

        monkeypatch.setattr(collect, "collect_round", fake_collect_round)
        record = batch_collect.collect_one_round(2025, 1, tmp_path, force=False)
        assert record["status"] == "unavailable-session"

    def test_zero_race_entries_is_classified_as_unavailable_not_success(self, tmp_path, monkeypatch):
        def fake_collect_round(season, round_no, driver_codes=None):
            return {"schemaVersion": collect.SCHEMA_VERSION, "season": season, "round": round_no, "qualifying": [], "race": []}

        monkeypatch.setattr(collect, "collect_round", fake_collect_round)
        record = batch_collect.collect_one_round(2025, 1, tmp_path, force=False)
        assert record["status"] == "unavailable-session"

    def test_successful_collection_writes_the_expected_file(self, tmp_path, monkeypatch):
        def fake_collect_round(season, round_no, driver_codes=None):
            return {
                "schemaVersion": collect.SCHEMA_VERSION, "season": season, "round": round_no,
                "qualifying": [{"driverId": "norris"}],
                "race": [{"driverId": "norris"}, {"driverId": "piastri"}],
            }

        monkeypatch.setattr(collect, "collect_round", fake_collect_round)
        record = batch_collect.collect_one_round(2025, 1, tmp_path, force=False)
        assert record["status"] == "success"
        assert record["driverCount"] == 2
        assert (tmp_path / "2025_01.json").exists()


class TestArgParser:
    def test_missing_required_arguments_exits_non_zero(self):
        parser = batch_collect.build_arg_parser()
        with pytest.raises(SystemExit) as excinfo:
            parser.parse_args([])
        assert excinfo.value.code != 0

    def test_valid_arguments_parse_successfully(self):
        parser = batch_collect.build_arg_parser()
        args = parser.parse_args(["--season", "2025", "--rounds", "1,4,7"])
        assert args.season == 2025
        assert args.rounds == "1,4,7"
        assert args.force is False
        assert args.fail_fast is False
