"""เทสต์ว่า engine ที่มีค่าใช้จ่ายไม่ขึ้นทะเบียนเองโดยไม่มีใครสั่ง

ทำไมต้องมีเทสต์: คีย์ API มักถูกใส่ไว้ใน .env ล่วงหน้าหรือใส่ไว้เพื่อใช้งานอื่น
ถ้าการ "เจอคีย์" เท่ากับ "อนุญาตให้ใช้เงิน" ค่าใช้จ่ายจะเกิดขึ้นโดยไม่มีใคร
ตัดสินใจ เทสต์นี้ตรึงไว้ว่าต้องตั้ง VISION_ENABLE_CLAUDE อย่างจงใจเท่านั้น

เทสต์ไม่เรียก API จริง จึงไม่มีค่าใช้จ่าย
"""

import engines


def test_env_flag_accepts_only_clear_yes():
    """ค่ากำกวมหรือพิมพ์ผิดต้องถือว่าปิด เพราะทางที่ผิดน้อยกว่าคือไม่เสียเงิน"""
    import os

    for value in ("1", "true", "TRUE", "yes", "on", " on "):
        os.environ["TEST_FLAG_X"] = value
        assert engines._env_flag("TEST_FLAG_X") is True, value

    for value in ("", "0", "false", "no", "off", "ture", "maybe", "2"):
        os.environ["TEST_FLAG_X"] = value
        assert engines._env_flag("TEST_FLAG_X") is False, value

    del os.environ["TEST_FLAG_X"]
    assert engines._env_flag("TEST_FLAG_X") is False


def test_claude_stays_unregistered_when_key_present_but_flag_unset(monkeypatch):
    """กรณีที่เกิดขึ้นจริง: คีย์อยู่ใน .env แล้วแต่ยังไม่มีใครสั่งให้ใช้เงิน"""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-ไม่ใช่คีย์จริง-ใช้ทดสอบเท่านั้น")
    monkeypatch.delenv("VISION_ENABLE_CLAUDE", raising=False)

    assert engines._build_claude() is None


def test_claude_stays_unregistered_when_flag_set_but_no_key(monkeypatch):
    """เปิดใช้แล้วแต่ไม่มีคีย์ ต้องไม่ปรากฏ ไม่ใช่ปรากฏแบบเรียกแล้วพัง"""
    monkeypatch.setenv("VISION_ENABLE_CLAUDE", "1")
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)

    assert engines._build_claude() is None


def test_claude_stays_unregistered_when_flag_is_a_typo(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-ไม่ใช่คีย์จริง")
    monkeypatch.setenv("VISION_ENABLE_CLAUDE", "ture")

    assert engines._build_claude() is None


def test_local_engines_report_no_cost(monkeypatch):
    """engine ที่รันในเครื่องต้องรายงาน costs_money เป็น false

    ผู้เรียกใช้ฟิลด์นี้ตัดสินใจว่าจะเสนอ engine ตัวไหนให้ผู้ใช้ ถ้าค่าผิด
    หน้าจอจะเตือนเรื่องค่าใช้จ่ายทั้งที่ไม่มี หรือไม่เตือนทั้งที่มี
    """
    from pathlib import Path

    wide = Path(engines.HERE) / "wide9.onnx"
    if not wide.is_file():
        import pytest

        pytest.skip("ไม่มีไฟล์ wide9.onnx ในเครื่องนี้")

    engine = engines._build_wide9(wide)
    assert engine.costs_money is False
    assert engine.to_dict()["costs_money"] is False
