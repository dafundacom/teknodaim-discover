import { TaggedError } from "better-result"

export class FeedIngestionError extends TaggedError("FeedIngestionError")<{
  message: string
  cause?: unknown
}>() {}

export class ArticleScrapeError extends TaggedError("ArticleScrapeError")<{
  message: string
  cause?: unknown
}>() {}

export class AISummarizationError extends TaggedError("AISummarizationError")<{
  message: string
  cause?: unknown
}>() {}

export class CitationExtractionError extends TaggedError(
  "CitationExtractionError",
)<{
  message: string
  cause?: unknown
}>() {}

export class PipelineError extends TaggedError("PipelineError")<{
  message: string
  cause?: unknown
}>() {}

export class ImageUploadError extends TaggedError("ImageUploadError")<{
  message: string
  cause?: unknown
}>() {}

export class SchedulerError extends TaggedError("SchedulerError")<{
  message: string
  cause?: unknown
}>() {}
