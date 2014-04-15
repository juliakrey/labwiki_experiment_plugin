

module LabWiki::Plugin::Experiment

  class ExperimentCommonRenderer < Erector::Widget
    include OMF::Base::Loggable
    extend OMF::Base::Loggable

    def initialize(widget, experiment)
      @widget = widget
      @experiment = experiment
      #@wopts = wopts
      @tab_index = 30
      @data_id = "e#{object_id}"
    end

    def content
      link :href => '/resource/plugin/experiment/css/experiment.css', :rel => "stylesheet", :type => "text/css"
      div :class => "experiment-description", :id => @data_id do
        render_content
      end
    end

    def title_info
      {
        img_src: '/resource/plugin/experiment/img/experiment2-32.png',
        title: @widget.title,
        #sub_title: '????',
        widget_id: @data_id
      }
    end


    def render_field(index, prop)
      comment = prop[:comment]
      name = prop[:name].downcase
      type = prop[:type] || :text

      fname = "prop" + (index >= 0 ? index.to_s : name)
      tr :class => fname do
        td name.gsub(/_/, ' ') + ':', :class => "desc" unless type.to_sym == :hidden
        td :class => "input #{fname}", :colspan => (comment ? 1 : 2) do
          case type.to_sym
          when :text
            input :name => fname, :type => "text", :class => "field text fn",
              :value => prop[:default] || "", :size => prop[:size] || 16, :tabindex => (@tab_index += 1)
          when :hidden
            input :name => fname, :type => "hidden", :value => prop[:default] || "", :tabindex => (@tab_index += 1)
          when :select
            select(name: fname) do
              prop[:options] && prop[:options].each do |opt|
                option(value: opt) { text opt }
              end
            end
          end
        end
        if comment
          td :class => "comment" do
            text comment
          end
        end
      end
    end

    def render_field_static(prop, with_comment = true)
      comment = prop[:comment]
      name = prop[:name].downcase
      tr do
        td name + ':', :class => "desc"
        td :class => "input", :colspan => (comment ? 1 : 2) do
          if url = prop[:url]
            a prop[:value], href: url
          else
            v = prop[:value]
            opts = {
              :class => (v ? 'defined' : 'undefined'),
              :id => (prop[:html_id] || "#{@data_id}_s_#{name}")
            }
            span v || 'undefined', opts
          end
        end
        if with_comment && comment
          td :class => "comment" do
            text comment
          end
        end
      end
    end
  end # class
end # module
