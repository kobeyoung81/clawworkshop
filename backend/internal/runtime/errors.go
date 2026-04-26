package runtime

import "errors"

var (
	ErrWorkflowNotFound        = errors.New("workflow not found")
	ErrTaskNotReady            = errors.New("task is not ready")
	ErrTaskAlreadyClaimed      = errors.New("task is already claimed")
	ErrTaskNotClaimed          = errors.New("task is not claimed by this actor")
	ErrTaskNotInProgress       = errors.New("task is not in progress")
	ErrTaskNotAwaitingReview   = errors.New("task is not awaiting review")
	ErrTaskNotAwaitingFeedback = errors.New("task is not awaiting feedback")
	ErrTaskUnsupported         = errors.New("task mutation is not supported for this node kind")
	ErrArtifactOutputMissing   = errors.New("required artifact outputs are missing")
	ErrArtifactNotFound        = errors.New("artifact not found")
	ErrReviewSessionClosed     = errors.New("review session is closed")
	ErrFeedbackSessionClosed   = errors.New("feedback session is closed")
	ErrInvalidReviewOutcome    = errors.New("review outcome is invalid")
)
