SHELL := /usr/bin/env bash

.PHONY: test-api test-api-isolated prepare-test-db prepare-phpstan-metadata lint-test cache-clear-test lint-php analyze-phpstan quality-fast quality-ci security-audit

test-api:
	composer test:api

test-api-isolated:
	composer test:api:isolated

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
