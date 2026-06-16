# frozen_string_literal: true
#
# Liquid filter: append a short content hash to a local asset URL so browsers
# always fetch the freshest version after a deploy (no stale CSS/JS).
#
#   <link rel="stylesheet" href="{{ '/styles.css' | bust }}">
#
# Note: GitHub Pages runs Jekyll in safe mode and skips custom plugins, so
# this is used by local `bundle exec jekyll serve` builds.

require "digest"

module Jekyll
  module CacheBuster
    def bust(path)
      site = @context.registers[:site]
      file = File.join(site.source, path.to_s.sub(%r{\A/}, ""))
      return path unless File.exist?(file)

      digest = Digest::MD5.file(file).hexdigest[0, 8]
      "#{path}?v=#{digest}"
    end
  end
end

Liquid::Template.register_filter(Jekyll::CacheBuster)
