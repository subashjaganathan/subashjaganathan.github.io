# frozen_string_literal: true
#
# Build automation for the portfolio (Jekyll / Ruby).
# List all tasks with `rake -T`.

require "fileutils"

SITE_DIR = "_site"
CACHE_DIR = ".jekyll-cache"

desc "Build the site for production"
task :build do
  sh "JEKYLL_ENV=production bundle exec jekyll build"
end

desc "Serve locally with live reload"
task :serve do
  sh "bundle exec jekyll serve --livereload"
end

desc "Remove build artifacts and caches"
task :clean do
  [SITE_DIR, CACHE_DIR].each { |dir| FileUtils.rm_rf(dir) }
  puts "Cleaned: #{SITE_DIR}, #{CACHE_DIR}"
end

desc "Run Jekyll's configuration health check"
task :doctor do
  sh "bundle exec jekyll doctor"
end

desc "Validate internal anchors and local asset references"
task :check do
  ruby "scripts/check_links.rb"
end

desc "Summarise the site source (bytes per type, section count)"
task :stats do
  require_relative "lib/portfolio/site_stats"
  Portfolio::SiteStats.new(".").report
end

desc "Full pipeline: clean, build, validate, summarise"
task default: %i[clean build check stats]
