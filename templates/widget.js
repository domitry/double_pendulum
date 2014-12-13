define("Viewer", function(){
    return {
        init_svg: function(svg){
            svg.attr("class", "viz").style({
                position: 'relative',
                width: 400,
                height: 400
            });

            svg.append("line").attr({"class": "L1"});
            svg.append("line").attr({"class": "L2"});
            svg.selectAll("circle")
                .data([1,2])
                .enter()
                .append("circle")
                .attr({
                    "class": function(d){return "J"+d;},
                    "r": 5,
                    "fill": function(d){return ["#8dd3c7", "#bebada"][d-1];}
                });

            svg.selectAll("line").attr({
                'stroke': "rgb(0,0,0)",
                'stroke-width': 3
            });
        },
        draw: function(parent, q){
            var L1=1, L2=1;
            var sin = Math.sin, cos = Math.cos, PI = Math.PI;
            var height = 200, rate=100;
            var s2px = function(x_val){return 200 + x_val*rate;},
                s2py = function(y_val){return height + y_val*rate;};

            parent.select(".J1").attr({
                cx: s2px(L1*sin(q[0])),
                cy: s2py(L1*cos(q[0]))
            });

            parent.select(".J2").attr({
                cx: s2px(L1*sin(q[0]) + L2*sin(q[1])),
                cy: s2py(L1*cos(q[0]) + L2*cos(q[1]))
            });

            parent.select(".L1")
                .attr({
                    x1: s2px(0),
                    y1: s2py(0),
                    x2: s2px(L1*sin(q[0])),
                    y2: s2py(L1*cos(q[0]))
                });

            parent.select(".L2")
                .attr({
                    x1: s2px(L1*sin(q[0])),
                    y1: s2py(L1*cos(q[0])),
                    x2: s2px(L1*sin(q[0]) + L2*sin(q[1])),
                    y2: s2py(L1*cos(q[0]) + L2*cos(q[1]))
                });
        }};
});

require(["d3", "underscore", "widgets/js/widget", "Viewer"], function(d3, _, WidgetManager, Viewer){
    // Define the DatePickerView
    var SimView = IPython.DOMWidgetView.extend({
        render: function(){
            this.$el.attr('width', 700);
            this.$el.attr('height', 700);
        },

        update: function() {
            return SimView.__super__.update.apply(this);
        },

        initialize: function(parameters){
            SimView.__super__.initialize.apply(this, [parameters]);

            //*** init view ***
            this.$el.addClass('widget-hbox');
            var dom = document.createElementNS("http://www.w3.org/2000/svg", "svg:svg");
            this.$el.append(dom);
            var svg = d3.select(dom);
            Viewer.init_svg(svg);

            // params
            var buff_size = 50;
            var duration = 10;

            // arr is ret value from p2
            var main = _.bind(function(arr){
                var dfd = new $.Deferred();

                var p2 = (function(){
                    var deferred = new $.Deferred();

                    if(arr.length == 0){
                        deferred.resolve();
                    }else{
                        var cnt = 0;
                        var loop = function(){
                            Viewer.draw(svg, arr[cnt]);

                            if(cnt == buff_size-1){
                                deferred.resolve();
                            }else{
                                cnt+=1;
                                window.setTimeout(loop, duration);
                            }
                        };
                        loop();
                    }
                    return deferred.promise();
                })();

                var p1 = (_.bind(function(){
                    var deferred = new $.Deferred();

                    this.model.send({
                        num: buff_size
                    });

                    // send custom message through Comm. See the following article to learn more:
                    // http://ipython.org/ipython-doc/dev/development/messaging.html
                    this.model.on('msg:custom', $.proxy(function(content){
                        if(content.error != true)
                            deferred.resolve(content.new_arr);
                        else
                            deferred.reject();
                    }), this);

                    return deferred.promise();
                }, this))();

                $.when(p1, p2).then(
                    main,
                    function(err1, err2){
                        console.log("Visualizer stopped.");
                    }
                );

                dfd.resolve();
                return dfd.promise();
            }, this);

            main([]);
        }
    });
    
    WidgetManager.register_widget_view('SimView', SimView);
});
