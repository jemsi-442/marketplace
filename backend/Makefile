SHELL := /usr/bin/env bash

.PHONY: test-api test-api-security test-api-lists test-api-disputes test-api-service-catalog test-api-isolated test-runtime-flows test-safe-payout provider-preflight prepare-test-db prepare-phpstan-metadata lint-test cache-clear-test lint-php analyze-phpstan quality-fast quality-ci security-audit seed-service-types

test-api:
	composer test:api

test-api-security:
	composer test:api:security

test-api-lists:
	composer test:api:lists

test-api-disputes:
	composer test:api:disputes

test-api-service-catalog:
	composer test:api:service-catalog

test-api-isolated:
	composer test:api:isolated

test-runtime-flows:
	bash test_runtime_marketplace_flows.sh

test-safe-payout:
	composer test:api:withdrawal-ledger

provider-preflight:
	bash bin/provider-preflight.sh

seed-service-types:
	composer seed:service-types

quality-fast:
	composer quality:fast

quality-ci:
	composer quality:ci

security-audit:
	composer security:audit

analyze-phpstan:
	composer analyze:phpstan

prepare-phpstan-metadata:
	composer prepare:phpstan-metadata

prepare-test-db:
	composer test:prepare-db

lint-test:
	php bin/console lint:container --env=test

lint-php:
	composer lint:php

cache-clear-test:
	php bin/console cache:clear --env=test
