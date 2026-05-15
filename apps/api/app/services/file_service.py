from app.schemas.interview import InterviewUpload


def store_upload_metadata(upload: InterviewUpload) -> InterviewUpload:
    """P0 stores only structured upload metadata; real file storage is deferred."""
    return upload
