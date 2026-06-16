# frozen_string_literal: true
#
# Generator: expose build metadata to templates so the footer (or a meta tag)
# can optionally show when and from which commit the site was last built.
#   {{ site.build_time }}  ->  "2026-06-19 14:02 UTC"
#   {{ site.build_rev }}   ->  short git SHA
#
# Runs on local Jekyll builds; GitHub Pages safe mode ignores custom plugins
# (templates therefore don't depend on these values).

require "time"

module Jekyll
  class BuildStamp < Generator
    safe true
    priority :low

    def generate(site)
      site.config["build_time"] = Time.now.utc.strftime("%Y-%m-%d %H:%M UTC")
      site.config["build_rev"]  = git_rev
    end

    private

    def git_rev
      rev = `git rev-parse --short HEAD 2>/dev/null`.strip
      rev.empty? ? "unknown" : rev
    end
  end
end
