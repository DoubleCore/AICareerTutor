from app.schemas.interview import InterviewUpload


def store_upload_metadata(upload: InterviewUpload) -> InterviewUpload:
    """P0 stores only structured upload metadata; real file storage is deferred."""
    return upload


def transcribe_audio(content: bytes, filename: str) -> str:
    """MP3 语音转写 —— 配了 DashScope key 走真实链路,否则回退 501 桩。

    分治架构(见 spec):PDF/DOCX 端上解析,MP3 走后端云 ASR。真实实现见 asr_service
    (阿里云百炼 Paraformer + DashScope 临时上传凭证,免自建 OSS),完整接法见
    .spec-workflow/specs/backend-feature-optimization/mp3-asr-aliyun.md。

    - 已配 dashscope_api_key:调 asr_service.transcribe 返回纯文本;失败抛 AsrError(路由→5xx)。
    - 未配 key:抛 NotImplementedError(路由→501 + 明确中文提示),保证「先流出接口、链路打通」。
    """
    from app.services import asr_service

    if not asr_service.is_configured():
        raise NotImplementedError("mp3 语音转写暂未支持")
    return asr_service.transcribe(content, filename)
