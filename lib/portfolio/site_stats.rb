# frozen_string_literal: true

module Portfolio
  # Collects simple statistics about the portfolio source: bytes per file
  # type and the number of page sections. Used by the `rake stats` task.
  class SiteStats
    SOURCE_EXTS = %w[.html .css .js .rb .yml .md].freeze
    IGNORED     = %w[_site vendor .jekyll-cache .git].freeze

    def initialize(root = ".")
      @root = root
    end

    # All source files we care about, skipping build output and vendored dirs.
    def files
      Dir.glob(File.join(@root, "**", "*"))
         .reject { |path| IGNORED.any? { |dir| path.include?(dir) } }
         .select { |path| File.file?(path) && SOURCE_EXTS.include?(File.extname(path)) }
    end

    def bytes_by_ext
      files.each_with_object(Hash.new(0)) do |path, totals|
        totals[File.extname(path)] += File.size(path)
      end
    end

    def section_count
      index = File.join(@root, "index.html")
      return 0 unless File.exist?(index)

      File.read(index).scan(/<section\b/).length
    end

    def report
      total = bytes_by_ext.values.sum
      puts "Portfolio source statistics"
      puts "-" * 34
      bytes_by_ext.sort_by { |_ext, n| -n }.each do |ext, n|
        pct = total.zero? ? 0 : (n * 100.0 / total)
        printf("  %-6s %8d bytes  (%5.1f%%)\n", ext, n, pct)
      end
      puts "-" * 34
      printf("  %-6s %8d bytes\n", "total", total)
      puts "  page sections: #{section_count}"
    end
  end
end
