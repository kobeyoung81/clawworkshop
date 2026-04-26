package ids

import (
	"crypto/rand"
	"io"
	"sync"
	"time"

	"github.com/oklog/ulid/v2"
)

var (
	entropyMu sync.Mutex
	entropy   = ulid.Monotonic(reader{}, 0)
)

type reader struct{}

func (reader) Read(p []byte) (int, error) {
	return io.ReadFull(rand.Reader, p)
}

func New() string {
	entropyMu.Lock()
	defer entropyMu.Unlock()

	return ulid.MustNew(ulid.Timestamp(time.Now().UTC()), entropy).String()
}
