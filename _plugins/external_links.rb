# frozen_string_literal: true
#
# Security hardening (DFIR habit): make sure every outbound link opens safely.
# After each page renders, any <a href="https://..."> without a rel attribute
# gets target="_blank" and rel="noopener noreferrer" so a malicious target page
# cannot reach back through window.opener.
#
# GitHub Pages safe mode skips custom plugins, so the source HTML already sets
# these explicitly; this enforces the rule for local builds and future pages.

module Jekyll
  module ExternalLinks
    EXTERNAL = %r{<a\s+href="(https?://[^"]+)"(?![^>]*\brel=)}.freeze

    def self.harden(html)
      html.gsub(EXTERNAL) do
        %(<a href="#{Regexp.last_match(1)}" target="_blank" rel="noopener noreferrer")
      end
    end
  end
end

Jekyll::Hooks.register %i[pages documents], :post_render do |item|
  next unless item.respond_to?(:output) && item.output_ext == ".html"

  item.output = Jekyll::ExternalLinks.harden(item.output)
end
