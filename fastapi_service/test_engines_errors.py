"""เทสต์การจำแนกความล้มเหลวของ engine claude

ทำไมต้องมีเทสต์: ``_classify_claude_error`` เป็นตัวตัดสินว่าผู้ใช้จะเห็นข้อความ
"ลองใหม่ภายหลัง" หรือ "ต้องไปแก้ค่าที่ตั้งไว้ก่อน" ถ้าจำแนกผิดฝั่ง เกษตรกรจะกด
ส่งภาพซ้ำไปเรื่อย ๆ โดยไม่มีใครรู้ว่าต้องไปเติมเครดิตหรือเปลี่ยนคีย์

เทสต์นี้ไม่เรียก API จริง จึงไม่มีค่าใช้จ่ายและรันได้ตอนไม่มีคีย์
"""

import engines


class FakeStatusError(Exception):
    """แทน ``anthropic.APIStatusError`` เท่าที่ตัวจำแนกใช้ คือ status_code กับข้อความ

    ตัวจำแนกอ่านด้วย ``getattr`` จึงไม่ต้องพึ่ง SDK ตอนรันเทสต์
    """

    def __init__(self, status_code: int, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code


def test_bad_key_is_not_retryable():
    """คีย์ถูกเพิกถอนหรือพิมพ์ผิด ลองใหม่กี่ครั้งก็ได้ 401 เหมือนเดิม"""
    out = engines._classify_claude_error(
        FakeStatusError(401, "invalid x-api-key"), "claude-opus-5-5"
    )
    assert isinstance(out, engines.EngineUnavailable)
    assert "ANTHROPIC_API_KEY" in str(out)


def test_forbidden_is_not_retryable():
    """คีย์ไม่มีสิทธิ์เรียกโมเดลนี้ ต้องไปแก้สิทธิ์ของคีย์"""
    out = engines._classify_claude_error(FakeStatusError(403, "forbidden"), "m")
    assert isinstance(out, engines.EngineUnavailable)


def test_unknown_model_names_the_configured_value():
    """ต้องบอกค่าที่ตั้งไว้ คนแก้จะได้รู้ว่าไปแก้ที่ไหน"""
    out = engines._classify_claude_error(FakeStatusError(404, "not found"), "พิมพ์ผิด-5")
    assert isinstance(out, engines.EngineUnavailable)
    # ต้องบอกค่าที่ตั้งไว้ ไม่ใช่แค่ว่าหาโมเดลไม่เจอ คนแก้จะได้รู้ว่าไปแก้ที่ไหน
    assert "พิมพ์ผิด-5" in str(out)
    assert "CLAUDE_VISION_MODEL" in str(out)


def test_no_credit_points_to_local_engines():
    """เครดิตหมดต้องบอกด้วยว่ายังมี engine ในเครื่องให้ใช้"""
    out = engines._classify_claude_error(
        FakeStatusError(400, "Your credit balance is too low to access the Anthropic API"),
        "claude-opus-5-5",
    )
    assert isinstance(out, engines.EngineUnavailable)
    assert "เครดิต" in str(out)
    # ต้องบอกว่ายังมี engine ที่ใช้ได้ ไม่ใช่ปล่อยให้เข้าใจว่าระบบใช้ไม่ได้ทั้งหมด
    assert "legacy4" in str(out)


def test_other_400_is_left_alone():
    """400 ครอบหลายเรื่อง เช่นภาพใหญ่เกิน ซึ่งเป็นเรื่องของคำขอนั้นคำขอเดียว

    ถ้าเหมารวมว่าเป็นปัญหาการตั้งค่าทั้งหมด จะได้ข้อความบอกให้ไปเติมเครดิต
    ทั้งที่เครดิตไม่ได้หมด
    """
    original = FakeStatusError(400, "image exceeds 5 MB maximum")
    out = engines._classify_claude_error(original, "claude-opus-5-5")
    assert out is original
    assert not isinstance(out, engines.EngineUnavailable)


def test_rate_limit_stays_retryable():
    """429 รีเซ็ตเองเมื่อเวลาผ่านไป การลองใหม่จึงมีโอกาสสำเร็จจริง"""
    original = FakeStatusError(429, "rate limit exceeded")
    out = engines._classify_claude_error(original, "claude-opus-5-5")
    assert out is original


def test_upstream_overload_stays_retryable():
    """529 คือต้นทางรับไม่ทันชั่วคราว ไม่ใช่ปัญหาการตั้งค่า"""
    original = FakeStatusError(529, "overloaded")
    out = engines._classify_claude_error(original, "claude-opus-5-5")
    assert out is original
