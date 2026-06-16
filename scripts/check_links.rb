#!/usr/bin/env ruby
# frozen_string_literal: true
#
# Validates the portfolio's internal integrity before a deploy:
#   * every in-page anchor (href="#id") resolves to a real element id
#   * every referenced local asset (css/js/png/pdf) exists on disk
# Exits non-zero on the first batch of problems so it can gate `rake check`.

require "set"

ROOT  = File.expand_path("..", __dir__)
INDEX = File.join(ROOT, "index.html")

abort("[FAIL] index.html not found at #{INDEX}") unless File.exist?(INDEX)

html = File.read(INDEX)

ids     = html.scan(/id="([^"]+)"/).flatten.to_set
anchors = html.scan(/href="#([^"]+)"/).flatten.reject(&:empty?).uniq
assets  = html.scan(/(?:href|src)="([^"#:?]+\.(?:css|js|png|pdf))"/).flatten.uniq

errors = []

anchors.each do |anchor|
  errors << "broken anchor: ##{anchor}" unless ids.include?(anchor)
end

assets.each do |asset|
  errors << "missing asset: #{asset}" unless File.exist?(File.join(ROOT, asset))
end

if errors.empty?
  puts "[OK] verified #{anchors.length} anchors and #{assets.length} assets."
  exit 0
end

warn "[FAIL] #{errors.length} problem(s) found:"
errors.each { |err| warn "  - #{err}" }
exit 1
