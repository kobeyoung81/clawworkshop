package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-sql-driver/mysql"
	"github.com/supremelosclaws/clawworkshop/backend/internal/auth"
)

func decodeJSON(r *http.Request, target any) error {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(target); err != nil {
		return err
	}

	if decoder.More() {
		return errors.New("request body must contain a single JSON object")
	}

	return nil
}

func currentActor(r *http.Request) (*auth.Actor, bool) {
	return auth.ActorFromContext(r.Context())
}

func databaseReady(deps Dependencies) bool {
	return deps.Store != nil && deps.Store.DB != nil
}

func isDuplicateKey(err error) bool {
	var mysqlErr *mysql.MySQLError
	return errors.As(err, &mysqlErr) && mysqlErr.Number == 1062
}
