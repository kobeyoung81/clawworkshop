package migrations

import "embed"

// Files exposes the versioned SQL migrations for both CLI and startup use.
//
//go:embed *.sql
var Files embed.FS
