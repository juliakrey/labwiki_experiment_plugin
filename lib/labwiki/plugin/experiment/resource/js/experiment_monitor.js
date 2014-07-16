define(['omf/data_source_repo', 'theme/labwiki/js/labwiki'], function (data_source_repo, LW) {


    var experiment_monitor = function (exp_name, el_prefix, properties) {
        var current_event = null;
        var graphs = {};
        var status_msgs_processed = 0;
        var toolbar_buttons = {};

        function ctxt() {};

        function process_status_messages(evt) {
            //var ds = data_source_repo.lookup('exp_status_' + exp_name);
            var ds = evt.data_source;
            var msgs = ds.rows(); //.events;
            _.each(msgs.slice(status_msgs_processed), function (e) {
                switch (e[1]) {
                case 'state':
                    process_state_message(e[2]);
                    break;
                case 'graph':
                    process_graph_announcement(e[2]);
                    break;
                case 'ex_prop':
                    process_ex_prop(e[2]);
                    break;
                default:
                    console.log("Don't know how to process '" + e[1] + "' status type");
                }
                status_msgs_processed += 1;
            });
            var i = 0;;

            // var gds = data_source_repo.lookup('graph_' + exp_name);
            // process_graph_announcements(gds);
            // OHUB.bind(gds.event_name, function(ev) {
            // process_graph_announcements(ev.data_source);
            // });

        }

        function process_state_message(msg) {
            // Display a badge in the sub title
            var sub_title = $('#' + el_prefix + '_widget_sub_title');
            var label;
            switch (msg) {
            case 'pending':
                label = 'label-default">Pending';
                break;
            case 'running':
                label = 'label-primary">Running';
                break;
            case 'finished':
                label = 'label-success">Finished';
                break;
            case 'failed':
                label = 'label-danger">Failed';
                break;
            case 'aborted':
                label = 'label-danger">Aborted';
                break;
            }
            if (label) {
                sub_title.html('<span class="label ' + label + '</span>');
            } else {
                console.log("WARN: Unknown state '" + msg + "'.");
            }

            // Display stop, dump button based on status
            toolbar_buttons.save.enable(msg == 'pending' || msg == 'running');
            toolbar_buttons.dump.enable(!(msg == 'pending' || msg == 'failed'));
            //toolbar_buttons.analyse.enable(!(msg == 'pending' || msg == 'failed'));
            toolbar_buttons.analyse.enable(true);

                // Update status field in experiment properties
                var status = $('#' + el_prefix + '_s_status');
            status.text(msg);
            status.removeClass('undefined').addClass('defined');
            status.parent().effect("highlight", {}, 2000);
        }

        function process_ex_prop(prop_list) {
            _.each(prop_list, function (v, k) {
                var ex_prop = $('#' + el_prefix + '_s_' + k);
                ex_prop.text(v);
                ex_prop.parent().effect("highlight", {}, 2000);
            });
        }

        var ec_msgs_processed = 0;

        function process_ec_messages(ev) {
            var msgs = ev.data_source.rows();
            _.each(msgs.slice(ec_msgs_processed), function (e) {
                switch (e[1]) {
                case 'prop':
                    process_prop_update(e[2], e[3]);
                    break;
                }
                ec_msgs_processed += 1;
            });
        }

        var prop_templ = '<tr id="{id}">\
                        <td class="desc">{name}</td>\
                        <td class="input"><span class="{klass}" >{value}</span></td>\
                      </tr>';
        var properties = {};

        function process_prop_update(name, value) {
            if (properties[name] == value) return;

            properties[name] = value;
            id = el_prefix + '_p_' + name;
            s = {
                id: id,
                name: name,
                value: (value == '_undefined_') ? 'undefined' : "" + value,
                klass: (value == '_undefined_') ? 'undefined' : 'defined'
            };
            var html = prop_templ.replace(/{[^{}]+}/g, function (key) {
                return s[key.replace(/[{}]+/g, "")] || "";
            });
            var tr = $('#' + id);
            if (tr.length == 0) {
                var tbl = $('#' + el_prefix + '_prop_table');
                tbl.append(html);
            } else {
                tr.replaceWith(html);
            }
            var td = $('#' + id).find("td.input");
            td.effect("highlight", {}, 2000);
        }

        log_severity = [
            ['default', 'D'],
            ['primary', 'I'],
            ['warning', 'W'],
            ['danger', 'E']
        ];

        function update_log_table(evt) {
            //var ds = data_source_repo.lookup('exp_log_' + exp_name);
            var ds = evt.data_source;
            var msgs = ds.rows(); //.events;
            var l = msgs.length;
            if (l < 1 || current_event == msgs[l - 1]) return;

            var html = "";
            _.each(msgs.slice(0).reverse(), function (e) {
                var ts = e[1].toFixed(1);
                var severity = log_severity[e[2]];
                var message = e[4];

                html = html + '<tr><td>' + ts + '</td><td><span class="label label-' + severity[0] + '">' + severity[1] + '</span></td><td>' + message.replace(/</g, '&lt;') + '</td></tr>';
            });
            $('table.experiment-log').html(html);
        }

        function embed(embed_container, options) {
            var opts = jQuery.extend(true, {}, options); // deep copy
            var type = opts.type;

            // Create a div to embed the graph in
            var eid = 'e' + Math.round((Math.random() * 10E12));
            var caption = options.caption || 'Caption Missing';
            var cap_h = '<div class="experiment-graph-caption">'
                //+ '<a href="#" id="d' + id + '" class="ui-draggable">_</a>'
                //+ '<div id="d' + id + '"><img src="/resource/plugin/experiment/img/graph_drag.png"></img></div>'
                + '<img src="/resource/plugin/experiment/img/graph_drag.png" id="d' + eid + '"></img>' + '<span class="experiment-graph-caption-figure">Figure:</span>' + '<span class="experiment-graph-caption-text">' + caption + '</span>' + '</div>';
            embed_container
                .append('<div class="oml_' + type + '" id="w' + eid + '"></div>')
                .append(cap_h);
            opts.base_el = '#w' + eid;
            //require(['/resource/graph/js/' + type + '.js'], function(graph) {
            require(['graph/' + type], function (graph) {
                //graphs[eid] = new OML[type](opts);
                new graph(opts);
            });

            // Make Caption draggable
            var del = $('#d' + eid);
            //del.data('content', {mime_type: 'data/graph', opts: opts });
            del.data('content', function () {
                return graph_description(opts);
            });
            del.data('embedder', function (embed_container) {
                embed(embed_container, options);
            });
            del.draggable({
                appendTo: "body",
                helper: "clone",
                stack: 'body',
                zIndex: 9999
            });
        };

        function graph_description(gopts) {
            var d = {
                mime_type: 'data/graph',
                graph_type: gopts.type,
                caption: gopts.caption,
                mapping: gopts.mapping,
                axis: gopts.axis,
            };
            d.data_sources = _.map(gopts.data_sources, function (ds) {
                return {
                    id: ds.id,
                    name: ds.name,
                    schema: _.map(ds.schema, function (v, k) {
                        return v;
                    }),
                    context: ds.context,
                    data_url: ds.data_url
                };
            });
            return d;
        }

        function process_graph_announcement(gd) {
            // Create the datasources
            _.each(gd.data_sources, function (dsh) {
                var ds = data_source_repo.register(dsh);
            });
            embed($('div.experiment-graphs'), gd);
        };

        /************** INIT ***********/

        var dsn = exp_name + "_" + LW.session_id;
        OHUB.bind('data_source.exp_log_' + dsn + '.changed', update_log_table);
        OHUB.bind('data_source.exp_status_' + dsn + '.changed', process_status_messages);
        OHUB.bind('data_source.exp_ec_' + dsn + '.changed', process_ec_messages);

        _.each(properties, function (p) {
            process_prop_update(name, value);
        });

        var sections = $('.widget_body h3 a.toggle');
        sections.click(function (ev) {
            var a = $(this);
            a.toggleClass('toggle-closed');
            var p = a.parent().next();
            p.slideToggle(400);
            return false;
        });

        var pc = LW.execute_controller;
        var b = toolbar_buttons;

        function handle_request_action_reply(reply) {
            if (reply.success != undefined) {
                $(".alert-toolbar").show();
                $(".alert-toolbar").html(reply.success).addClass("alert-success").removeClass("alert-danger");
            } else {
                $(".alert-toolbar").show();
                $(".alert-toolbar").html(reply.error).addClass("alert-danger").removeClass("alert-success");
            }
        };

        b.save = pc.add_toolbar_button({
                name: 'stop-experiment',
                awsome: 'stop',
                tooltip: 'Stop Experiment',
                active: true
            },
            function (ctxt) {
                ctxt.configure({
                    awsome: 'spinner fa-spin',
                    label: 'Stopping...'
                });
                var opts = {
                    action: 'stop_experiment',
                    col: 'execute'
                };

                LW.execute_controller.request_action(opts, 'POST', function (reply) {
                    ctxt.configure({
                        awsome: 'stop',
                        active: false
                    });
                    handle_request_action_reply(reply);
                });
                return false;
            });

        b.dump = pc.add_toolbar_button({
                name: 'dump',
                awsome: 'download',
                tooltip: 'Dump State to iRODS',
                active: false
            },
            function (ctxt) {
                ctxt.configure({
                    awsome: 'spinner fa-spin',
                    label: 'Dumping...'
                });
                var opts = {
                    action: 'dump',
                    col: 'execute'
                };

                LW.execute_controller.request_action(opts, 'POST', function (reply) {
                    ctxt.configure({
                        awsome: 'download',
                        active: false
                    });
                    handle_request_action_reply(reply);
                    setTimeout(function () {
                        $(".alert-toolbar").hide();
                        ctxt.configure({
                            awsome: 'download',
                            active: true
                        });
                    }, 10000);
                });
                return false;
            });

        b.analyse = pc.add_toolbar_button({
                name: 'analyse',
                awsome: 'arrow-circle-right',
                tooltip: 'Analyse data with RStudio',
                active: false
            },
            function (ctxt) {
                ctxt.configure({
                    awsome: 'spinner fa-spin',
                    label: 'Analysing...'
                });
                var opts = {
                    action: 'analyse',
                    col: 'execute'
                };
		login();
		//window.open("http://221.199.209.249:8787");
                LW.execute_controller.request_action(opts, 'POST', function (reply) {
                    ctxt.configure({
                        awsome: 'analyse',
                        active: false
                    });
                    handle_request_action_reply(reply);

                });
                return false;
            });

	function login() {


    	try {
		try {
		$.ajax({
  			type: "GET",
  			url: "/plugin/experiment/getPublicKey",
			})
  			.done(function(msg) {
			alert("pK " + msg);
    			//loginRequest(msg);
			getCookie(msg);
  		});

		} catch (exception) {
			alert("ErrorSubmit: " + exception); }
		
	} catch (exception) {
		alert("Error: " + exception);
	}

	};

	function loginRequest(publicKey) {
		var username = 'ruser';
           	var password = '875test123BH';
                var payload = username + "\n" + password;
                var chunks = publicKey.split(':', 2);
                var exp = chunks[0];
                var mod = chunks[1];
                var encrypted = encrypt(payload, exp, mod);
                var pck = encrypted;
		alert(encrypted);
		$.ajax({
  			type: "POST",
  			url: "/plugin/experiment/loginR",
  			data: { pck: pck }
			})
  			.done(function(msg) {
			alert(msg);
    			//restartRequest(msg);
  		});
		
	}

	function getCookie(publicKey) {
	var username = 'ruser';
      var password = '875test123BH';
       var payload = username + "\n" + password;
        var chunks = publicKey.split(':', 2);
        var exp = chunks[0];
        var mod = chunks[1];
        var encrypted = encrypt(payload, exp, mod);
        var pck = encrypted;
	$.ajax({
 			type: "POST",
 			url: "/plugin/experiment/getSetCookie",
			data: { pck: pck }
			})
			.done(function(cookie) {
			clientInit(cookie);
  			//loginToR(cookie, publicKey);
			//window.open("http://221.199.209.249:8787");
			
 		});
	}


	function loginToR(cookie, publicKey) {
	alert("loginToR");
	var username = 'ruser';
      var password = '875test123BH';
       var payload = username + "\n" + password;
        var chunks = publicKey.split(':', 2);
        var exp = chunks[0];
        var mod = chunks[1];
        var encrypted = encrypt(payload, exp, mod);
	var encryption = encodeURIComponent(encrypted);
        var pck = "persist=1&appUri=&clientPath=%2Fauth-sign-in&v=" + encryption;
	$.ajax({
  		type: "POST",
  		url: "http://221.199.209.249:8787/auth-do-sign-in/",
  		data: pck,
		contentType: "application/x-www-form-urlencoded",
		complete: function(xhr, textStatus) {alert(xhr.status + " " + xhr.getAllResponseHeaders());}
		//cookie: cookie,
		//xhrFields: { withCredentials:true }
		})
  		.done(function(msg) {
		alert("done");
		//alert("loginToR: " + msg);
		//alert (msg.getAllResponseHeaders());
    		//restartRequest(msg);
  		}).fail(function (jqXHR, textStatus, errorThrown) { alert(jqXHR.responseText + " " + jqXHR.responseXML + " " + jqXHR.responseHeader);})
    		.always(function() { alert("complete"); });
	alert("after ajax");
}

function clientInit(cookie) {
	params = {method:"client_init", params:[], version:0};
	json = JSON.stringify(params);
	alert(json);
	alert(cookie);
	$.ajax({
 			type: "POST",
 			url: "http://221.199.209.249:8787/rpc/client_init/",
			contentType: "application/json; charset=UTF-8",
			data: json,
			cookie: cookie,
			xhrFields: { withCredentials:true }
			})
			.done(function(msg) {
  			alert(msg);
 		}).fail(function (jqXHR, textStatus, errorThrown) { alert(textStatus + "     " + errorThrown + "    " + jqXHR.responseText + " " + jqXHR.responseXML + " " + jqXHR.responseHeader);})
    		.always(function() { alert("complete"); });
	}




var g, j, k = (244837814094590 & 16777215) == 15715070;

function l(b, a, c) {
    if (b != null){
        if ("number" == typeof b) this.ca(b, a, c);
        else a == null && "string" != typeof b ? this.z(b, 256) : this.z(b, a); }
}

function m() {
    return new l(null);
}

function o(b, a, c, d, e, f) {
    for (; --f >= 0;) {
        var h = a * this[b++] + c[d] + e;
        e = Math.floor(h / 67108864);
        c[d++] = h & 67108863;
    }
    return e;
}

function p(b, a, c, d, e, f) {
    var h = a & 32767;
    for (a = a >> 15; --f >= 0;) {
        var i = this[b] & 32767,
            n = this[b++] >> 15,
            r = a * i + n * h;
        i = h * i + ((r & 32767) << 15) + c[d] + (e & 1073741823);
        e = (i >>> 30) + (r >>> 15) + a * n + (e >>> 30);
        c[d++] = i & 1073741823;
    }
    return e;
}

function s(b, a, c, d, e, f) {
    var h = a & 16383;
    for (a = a >> 14; --f >= 0;) {
        var i = this[b] & 16383,
            n = this[b++] >> 14,
            r = a * i + n * h;
        i = h * i + ((r & 16383) << 14) + c[d] + e;
        e = (i >> 28) + (r >> 14) + a * n;
        c[d++] = i & 268435455;
    }
    return e;
}
if (k && navigator.appName == "Microsoft Internet Explorer") {
    l.prototype.i = p;
    j = 30;
} else if (k && navigator.appName != "Netscape") {
    l.prototype.i = o;
    j = 26;
} else {
    l.prototype.i = s;
    j = 28;
}
g = l.prototype;
g.c = j;
g.g = (1 << j) - 1;
g.h = 1 << j;
g.K = Math.pow(2, 52);
g.r = 52 - j;
g.s = 2 * j - 52;
var t = "0123456789abcdefghijklmnopqrstuvwxyz",
    u = [],
    x, z;
x = "0".charCodeAt(0);
for (z = 0; z <= 9; ++z) u[x++] = z;
x = "a".charCodeAt(0);
for (z = 10; z < 36; ++z) u[x++] = z;
x = "A".charCodeAt(0);
for (z = 10; z < 36; ++z) u[x++] = z;

function A(b, a) {
    b = u[b.charCodeAt(a)];
    return b == null ? -1 : b;
}

function B(b) {
    for (var a = this.a - 1; a >= 0; --a) b[a] = this[a];
    b.a = this.a;
    b.b = this.b;
}

function D(b) {
    this.a = 1;
    this.b = b < 0 ? -1 : 0;
    if (b > 0) this[0] = b;
    else if (b < -1) this[0] = b + DV;
    else this.a = 0;
}

function E(b) {
    var a = m();
    a.w(b);
    return a;
}

function F(b, a) {
    if (a == 16) a = 4;
    else if (a == 8) a = 3;
    else if (a == 256) a = 8;
    else if (a == 2) a = 1;
    else if (a == 32) a = 5;
    else if (a == 4) a = 2;
    else {
        this.da(b, a);
        return;
    }
    this.b = this.a = 0;
    for (var c = b.length, d = false, e = 0; --c >= 0;) {
        var f = a == 8 ? b[c] & 255 : A(b, c);
        if (f < 0) {
            if (b.charAt(c) == "-") d = true;
        } else {
            d = false;
            if (e == 0) this[this.a++] = f;
            else if (e + a > this.c) {
                this[this.a - 1] |= (f & (1 << this.c - e) - 1) << e;
                this[this.a++] = f >> this.c - e;
            } else this[this.a - 1] |= f << e;
            e += a;
            if (e >= this.c) e -= this.c;
        }
    }
    if (a == 8 && (b[0] & 128) != 0) {
        this.b = -1;
        if (e > 0) this[this.a - 1] |= (1 << this.c - e) - 1 << e;
    }
    this.j();
    d && G.f(this, this);
}

function H() {
    for (var b = this.b & this.g; this.a > 0 && this[this.a - 1] == b;)--this.a;
}

function I(b) {
    if (this.b < 0) return "-" + this.G().toString(b);
    if (b == 16) b = 4;
    else if (b == 8) b = 3;
    else if (b == 2) b = 1;
    else if (b == 32) b = 5;
    else if (b == 4) b = 2;
    else return this.ga(b);
    var a = (1 << b) - 1,
        c, d = false,
        e = "",
        f = this.a,
        h = this.c - f * this.c % b;
    if (f-- > 0) {
        if (h < this.c && (c = this[f] >> h) > 0) {
            d = true;
            e = t.charAt(c);
        }
        for (; f >= 0;) {
            if (h < b) {
                c = (this[f] & (1 << h) - 1) << b - h;
                c |= this[--f] >> (h += this.c - b);
            } else {
                c = this[f] >> (h -= b) & a;
                if (h <= 0) {
                    h += this.c;
                    --f;
                }
            } if (c > 0) d = true;
            if (d) e += t.charAt(c);
        }
    }
    return d ? e : "0";
}

function J() {
    var b = m();
    G.f(this, b);
    return b;
}

function K() {
    return this.b < 0 ? this.G() : this;
}

function L(b) {
    var a = this.b - b.b;
    if (a != 0) return a;
    var c = this.a;
    a = c - b.a;
    if (a != 0) return a;
    for (; --c >= 0;)
        if ((a = this[c] - b[c]) != 0) return a;
    return 0;
}

function M(b) {
    var a = 1,
        c;
    if ((c = b >>> 16) != 0) {
        b = c;
        a += 16;
    }
    if ((c = b >> 8) != 0) {
        b = c;
        a += 8;
    }
    if ((c = b >> 4) != 0) {
        b = c;
        a += 4;
    }
    if ((c = b >> 2) != 0) {
        b = c;
        a += 2;
    }
    if (b >> 1 != 0) a += 1;
    return a;
}

function N() {
    if (this.a <= 0) return 0;
    return this.c * (this.a - 1) + M(this[this.a - 1] ^ this.b & this.g);
}

function aa(b, a) {
    var c;
    for (c = this.a - 1; c >= 0; --c) a[c + b] = this[c];
    for (c = b - 1; c >= 0; --c) a[c] = 0;
    a.a = this.a + b;
    a.b = this.b;
}

function ba(b, a) {
    for (var c = b; c < this.a; ++c) a[c - b] = this[c];
    a.a = Math.max(this.a - b, 0);
    a.b = this.b;
}

function ca(b, a) {
    var c = b % this.c,
        d = this.c - c,
        e = (1 << d) - 1;
    b = Math.floor(b / this.c);
    var f = this.b << c & this.g,h;
    for (h = this.a - 1; h >= 0; --h) {
        a[h + b + 1] = this[h] >> d | f;
        f = (this[h] & e) << c;
    }
    for (h = b - 1; h >= 0; --h) a[h] = 0;
    a[b] = f;
    a.a = this.a + b + 1;
    a.b = this.b;
    a.j();
}

function da(b, a) {
    a.b = this.b;
    var c = Math.floor(b / this.c);
    if (c >= this.a) a.a = 0;
    else {
        b = b % this.c;
        var d = this.c - b,
            e = (1 << b) - 1;
        a[0] = this[c] >> b;
        for (var f = c + 1; f < this.a; ++f) {
            a[f - c - 1] |= (this[f] & e) << d;
            a[f - c] = this[f] >> b;
        }
        if (b > 0) a[this.a - c - 1] |= (this.b & e) << d;
        a.a = this.a - c;
        a.j();
    }
}

function ea(b, a) {
    for (var c = 0, d = 0, e = Math.min(b.a, this.a); c < e;) {
        d += this[c] - b[c];
        a[c++] = d & this.g;
        d >>= this.c;
    }
    if (b.a < this.a) {
        for (d -= b.b; c < this.a;) {
            d += this[c];
            a[c++] = d & this.g;
            d >>= this.c;
        }
        d += this.b;
    } else {
        for (d += this.b; c < b.a;) {
            d -= b[c];
            a[c++] = d & this.g;
            d >>= this.c;
        }
        d -= b.b;
    }
    a.b = d < 0 ? -1 : 0;
    if (d < -1) a[c++] = this.h + d;
    else if (d > 0) a[c++] = d;
    a.a = c;
    a.j();
}

function fa(b, a) {
    var c = this.abs(),
        d = b.abs(),
        e = c.a;
    for (a.a = e + d.a; --e >= 0;) a[e] = 0;
    for (e = 0; e < d.a; ++e) a[e + c.a] = c.i(0, d[e], a, e, 0, c.a);
    a.b = 0;
    a.j();
    this.b != b.b && G.f(a, a);
}

function ga(b) {
    for (var a = this.abs(), c = b.a = 2 * a.a; --c >= 0;) b[c] = 0;
    for (c = 0; c < a.a - 1; ++c) {
        var d = a.i(c, a[c], b, 2 * c, 0, 1);
        if ((b[c + a.a] += a.i(c + 1, 2 * a[c], b, 2 * c + 1, d, a.a - c - 1)) >= a.h) {
            b[c + a.a] -= a.h;
            b[c + a.a + 1] = 1;
        }
    }
    if (b.a > 0) b[b.a - 1] += a.i(c, a[c], b, 2 * c, 0, 1);
    b.b = 0;
    b.j();
}

function ha(b, a, c) {
    var d = b.abs();
    if (!(d.a <= 0)) {
        var e = this.abs();
        if (e.a < d.a) {
            a != null && a.w(0);
            c != null && this.m(c);
        } else {
            if (c == null) c = m();
            var f = m(),
                h = this.b;
            b = b.b;
            var i = this.c - M(d[d.a - 1]);
            if (i > 0) {
                d.A(i, f);
                e.A(i, c);
            } else {
                d.m(f);
                e.m(c);
            }
            d = f.a;
            e = f[d - 1];
            if (e != 0) {
                var n = e * (1 << this.r) + (d > 1 ? f[d - 2] >> this.s : 0),
                    r = this.K / n;
                n = (1 << this.r) / n;
                var ia = 1 << this.s,
                    w = c.a,
                    y = w - d,
                    q = a == null ? m() : a;
                f.o(y, q);
                if (c.l(q) >= 0) {
                    c[c.a++] = 1;
                    c.f(q, c);
                }
                O.o(d, q);
                for (q.f(f, f); f.a < d;) f[f.a++] = 0;
                for (; --y >= 0;) {
                    var C = c[--w] == e ? this.g : Math.floor(c[w] * r + (c[w - 1] + ia) * n);
                    if ((c[w] += f.i(0, C, c, y, 0, d)) < C) {
                        f.o(y, q);
                        for (c.f(q, c); c[w] < --C;) c.f(q, c);
                    }
                }
                if (a != null) {
                    c.u(d, a);
                    h != b && G.f(a, a);
                }
                c.a = d;
                c.j();
                i > 0 && c.W(i, c);
                h < 0 && G.f(c, c);
            }
        }
    }
}

function ja(b) {
    var a = m();
    this.abs().p(b, null, a);
    this.b < 0 && a.l(G) > 0 && b.f(a, a);
    return a;
}

function P(b) {
    this.d = b;
}

function ka(b) {
    return b.b < 0 || b.l(this.d) >= 0 ? b.R(this.d) : b;
}

function la(b) {
    return b;
}

function ma(b) {
    b.p(this.d, null, b);
}

function na(b, a, c) {
    b.F(a, c);
    this.reduce(c);
}

function oa(b, a) {
    b.J(a);
    this.reduce(a);
}
g = P.prototype;
g.t = ka;
g.H = la;
g.reduce = ma;
g.D = na;
g.I = oa;

function pa() {
    if (this.a < 1) return 0;
    var b = this[0];
    if ((b & 1) == 0) return 0;
    var a = b & 3;
    a = a * (2 - (b & 15) * a) & 15;
    a = a * (2 - (b & 255) * a) & 255;
    a = a * (2 - ((b & 65535) * a & 65535)) & 65535;
    a = a * (2 - b * a % this.h) % this.h;
    return a > 0 ? this.h - a : -a;
}

function Q(b) {
    this.d = b;
    this.B = b.P();
    this.C = this.B & 32767;
    this.T = this.B >> 15;
    this.Y = (1 << b.c - 15) - 1;
    this.U = 2 * b.a;
}

function qa(b) {
    var a = m();
    b.abs().o(this.d.a, a);
    a.p(this.d, null, a);
    b.b < 0 && a.l(G) > 0 && this.d.f(a, a);
    return a;
}

function ra(b) {
    var a = m();
    b.m(a);
    this.reduce(a);
    return a;
}

function sa(b) {
    for (; b.a <= this.U;) b[b.a++] = 0;
    for (var a = 0; a < this.d.a; ++a) {
        var c = b[a] & 32767,
            d = c * this.C + ((c * this.T + (b[a] >> 15) * this.C & this.Y) << 15) & b.g;
        c = a + this.d.a;
        for (b[c] += this.d.i(0, d, b, a, 0, this.d.a); b[c] >= b.h;) {
            b[c] -= b.h;
            b[++c]++;
        }
    }
    b.j();
    b.u(this.d.a, b);
    b.l(this.d) >= 0 && b.f(this.d, b);
}

function ta(b, a) {
    b.J(a);
    this.reduce(a);
}

function ua(b, a, c) {
    b.F(a, c);
    this.reduce(c);
}
g = Q.prototype;
g.t = qa;
g.H = ra;
g.reduce = sa;
g.D = ua;
g.I = ta;

function va() {
    return (this.a > 0 ? this[0] & 1 : this.b) == 0;
}

function wa(b, a) {
    if (b > 4294967295 || b < 1) return O;
    var c = m(),
        d = m(),
        e = a.t(this),
        f = M(b) - 1;
    for (e.m(c); --f >= 0;) {
        a.I(c, d);
        if ((b & 1 << f) > 0) a.D(d, e, c);
        else {
            var h = c;
            c = d;
            d = h;
        }
    }
    return a.H(c);
}

function xa(b, a) {
    a = b < 256 || a.Q() ? new P(a) : new Q(a);
    return this.exp(b, a);
}
g = l.prototype;
g.m = B;
g.w = D;
g.z = F;
g.j = H;
g.o = aa;
g.u = ba;
g.A = ca;
g.W = da;
g.f = ea;
g.F = fa;
g.J = ga;
g.p = ha;
g.P = pa;
g.Q = va;
g.exp = wa;
g.toString = I;
g.G = J;
g.abs = K;
g.l = L;
g.L = N;
g.R = ja;
g.S = xa;
var G = E(0),
    O = E(1);

function R() {
    this.n = this.k = 0;
    this.e = [];
}

function ya(b) {
    var a, c, d;
    for (a = 0; a < 256; ++a) this.e[a] = a;
    for (a = c = 0; a < 256; ++a) {
        c = c + this.e[a] + b[a % b.length] & 255;
        d = this.e[a];
        this.e[a] = this.e[c];
        this.e[c] = d;
    }
    this.n = this.k = 0;
}

function za() {
    var b;
    this.k = this.k + 1 & 255;
    this.n = this.n + this.e[this.k] & 255;
    b = this.e[this.k];
    this.e[this.k] = this.e[this.n];
    this.e[this.n] = b;
    return this.e[b + this.e[this.k] & 255];
}
R.prototype.O = ya;
R.prototype.next = za;
var S = 256,
    T, U, V;

function W(b) {
    U[V++] ^= b & 255;
    U[V++] ^= b >> 8 & 255;
    U[V++] ^= b >> 16 & 255;
    U[V++] ^= b >> 24 & 255;
    if (V >= S) V -= S;
}
if (U == null) {
    U = [];
    V = 0;
    var X;
    if (navigator.appName == "Netscape" && navigator.appVersion < "5" && window.crypto) {
        var Y = window.crypto.random(32);
        for (X = 0; X < Y.length; ++X) U[V++] = Y.charCodeAt(X) & 255;
    }
    for (; V < S;) {
        X = Math.floor(65536 * Math.random());
        U[V++] = X >>> 8;
        U[V++] = X & 255;
    }
    V = 0;
    W((new Date).getTime());
}

function Aa() {
    if (T == null) {
        W((new Date).getTime());
        T = new R;
        T.O(U);
        for (V = 0; V < U.length; ++V) U[V] = 0;
        V = 0;
    }
    return T.next();
}

function Ba(b) {
    var a;
    for (a = 0; a < b.length; ++a) b[a] = Aa();
}

function Z() {}
Z.prototype.V = Ba;

function SS() {
    this.q = null;
    this.v = 0;
    this.Z = this.ba = this.aa = this.fa = this.ea = this.SS = null;
}

function Ca(b, a) {
    if (b != null && a != null && b.length > 0 && a.length > 0) {
        this.q = new l(b, 16);
        this.v = parseInt(a, 16);
    } else alert("Invalid RSA public key");
}

function Da(b) {
    return b.S(this.v, this.q);
}

function Ea(b) {
    var a;
    a = this.q.L() + 7 >> 3;
    if (a < b.length + 11) {
        alert("Message too long for RSA");
        a = null;
    } else {
        for (var c = [], d = b.length - 1; d >= 0 && a > 0;) {
            var e = b.charCodeAt(d--);
            if (e < 128) c[--a] = e;
            else if (e > 127 && e < 2048) {
                c[--a] = e & 63 | 128;
                c[--a] = e >> 6 | 192;
            } else {
                c[--a] = e & 63 | 128;
                c[--a] = e >> 6 & 63 | 128;
                c[--a] = e >> 12 | 224;
            }
        }
        c[--a] = 0;
        b = new Z;
        for (d = []; a > 2;) {
            for (d[0] = 0; d[0] == 0;) b.V(d);
            c[--a] = d[0];
        }
        c[--a] = 2;
        c[--a] = 0;
        a = new l(c);
    } if (a == null) return null;
    a = this.M(a);
    if (a == null) return null;
    a = a.toString(16);
    return (a.length & 1) == 0 ? a : "0" + a;
}
SS.prototype.M = Da;
SS.prototype.X = Ca;
SS.prototype.N = Ea;
function encrypt(b, a, c) {
    var d = new SS;
    d.X(c, a);
    b = d.N(b);
    d = "";
    for (a = 0; a + 3 <= b.length; a += 3) {
        c = parseInt(b.substring(a, a + 3), 16);
        d += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charAt(c >> 6) + "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charAt(c & 63);
    }
    if (a + 1 == b.length) {
        c = parseInt(b.substring(a, a + 1), 16);
        d += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charAt(c << 2);
    } else if (a + 2 == b.length) {
        c = parseInt(b.substring(a, a + 2), 16);
        d += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charAt(c >> 2) + "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charAt((c & 3) << 4);
    }
    for (;(d.length & 3) > 0;) d += "=";
    return d;
};



        return ctxt;
    };

    return experiment_monitor;
});






