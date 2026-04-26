package auth

import (
	"context"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/lestrrat-go/jwx/v2/jwk"

	"github.com/supremelosclaws/clawworkshop/backend/internal/config"
)

type TokenValidator struct {
	enabled    bool
	jwksURL    string
	cookieName string
	cacheTTL   time.Duration
	client     *http.Client

	mu        sync.RWMutex
	cachedSet jwk.Set
	fetchedAt time.Time
}

func NewTokenValidator(cfg config.AuthConfig) *TokenValidator {
	return &TokenValidator{
		enabled:    cfg.Enabled,
		jwksURL:    cfg.JWKSURL,
		cookieName: cfg.CookieName,
		cacheTTL:   cfg.JWKSCacheTTL,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (v *TokenValidator) Enabled() bool {
	return v != nil && v.enabled
}

func (v *TokenValidator) CookieName() string {
	if v == nil || v.cookieName == "" {
		return "lc_access"
	}

	return v.cookieName
}

func (v *TokenValidator) ValidateToken(ctx context.Context, raw string, source string) (*Actor, error) {
	if raw == "" {
		return nil, ErrTokenMissing
	}
	if !v.Enabled() {
		return nil, ErrAuthDisabled
	}

	claims := &Claims{}
	token, err := jwt.ParseWithClaims(raw, claims, func(token *jwt.Token) (interface{}, error) {
		return v.lookupKey(ctx, token)
	}, jwt.WithValidMethods([]string{jwt.SigningMethodRS256.Alg()}))
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrUnauthorized, err)
	}
	if !token.Valid {
		return nil, ErrUnauthorized
	}

	return claims.ToActor(source), nil
}

func (v *TokenValidator) lookupKey(ctx context.Context, token *jwt.Token) (interface{}, error) {
	kid, _ := token.Header["kid"].(string)

	set, err := v.keySet(ctx, false)
	if err != nil {
		return nil, err
	}

	key, ok := selectJWK(set, kid)
	if !ok {
		set, err = v.keySet(ctx, true)
		if err != nil {
			return nil, err
		}
		key, ok = selectJWK(set, kid)
		if !ok {
			return nil, fmt.Errorf("jwks key %q not found", kid)
		}
	}

	var rawKey interface{}
	if err := key.Raw(&rawKey); err != nil {
		return nil, fmt.Errorf("extract jwk raw key: %w", err)
	}

	return rawKey, nil
}

func (v *TokenValidator) keySet(ctx context.Context, forceRefresh bool) (jwk.Set, error) {
	v.mu.RLock()
	if !forceRefresh && v.cachedSet != nil && time.Since(v.fetchedAt) < v.cacheTTL {
		defer v.mu.RUnlock()
		return v.cachedSet, nil
	}
	v.mu.RUnlock()

	v.mu.Lock()
	defer v.mu.Unlock()

	if !forceRefresh && v.cachedSet != nil && time.Since(v.fetchedAt) < v.cacheTTL {
		return v.cachedSet, nil
	}

	set, err := jwk.Fetch(ctx, v.jwksURL, jwk.WithHTTPClient(v.client))
	if err != nil {
		return nil, fmt.Errorf("fetch jwks: %w", err)
	}

	v.cachedSet = set
	v.fetchedAt = time.Now()

	return set, nil
}

func selectJWK(set jwk.Set, kid string) (jwk.Key, bool) {
	if kid != "" {
		key, ok := set.LookupKeyID(kid)
		if ok {
			return key, true
		}
	}

	if set.Len() == 1 {
		key, ok := set.Key(0)
		return key, ok
	}

	return nil, false
}
