package store

import "errors"

var ErrNotFound = errors.New("record not found")

var ErrConflict = errors.New("conflict")
