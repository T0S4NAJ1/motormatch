#!/usr/bin/env bash
cd "$(dirname "$0")"
npm install
npm run fixdb
npm run dev
