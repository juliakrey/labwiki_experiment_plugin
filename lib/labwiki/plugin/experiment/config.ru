map "/disconnect_all_db_connections" do
  handler = lambda do |env|
    LabWiki::Plugin::Experiment::Util.disconnect_all_db_connections
    [200, {}, ""]
  end
  run handler
end

map "/plugin/experiment/create_iwidget" do
  handler = lambda do |env|
    req = ::Rack::Request.new(env)
	

    LabWiki::Plugin::Experiment::IBookWidget.create_widget_zip(req)
  end
  run handler
end

## gets the public key of the RStudio Server
map "/plugin/experiment/getPublicKey" do
  handler = lambda do |env|
    require 'net/http'
    publicKey = Net::HTTP.get(URI.parse('http://221.199.209.249:8787/auth-public-key/'))
    [200, {}, "#{publicKey}"]
  end
  run handler
end

## gets the cookie of the labwiki session
map "/plugin/experiment/getCookie" do
  handler = lambda do |env|
    cookie = env['rack.request.cookie_string']
    [200, {}, cookie]
  end
  run handler
end

## logs in the user and gets the cookie from the server ('set-cookie')
map "/plugin/experiment/getSetCookie" do
  handler = lambda do |env|
    req = ::Rack::Request.new(env)
    pck = env['rack.input'].gets
    encr = "#{pck}"[4..-1]
    lcookie = env['rack.request.cookie_string']
    require 'uri'
    require 'net/http'
    uri = URI.parse('http://221.199.209.249:8787/auth-do-sign-in/')
    http = Net::HTTP.new(uri.host, uri.port)
    params = "persist=1&appUri=&clientPath=%2Fauth-sign-in&v=#{encr}"
    headers = {
      'Cookie' => lcookie,
      'Content-Type' => 'application/x-www-form-urlencoded'
   }
   resp, data = http.post(uri.path, params, headers)
   setCookie = "#{lcookie}; #{resp['set-cookie']}"
    [200, {}, setCookie]
  end
  run handler
end

## logs in the user and initializes the client and restarts the session (not working)
map "/plugin/experiment/loginR" do
  handler = lambda do |env|
    req = ::Rack::Request.new(env)
    pck = env['rack.input'].gets
    encr = "#{pck}"[4..-1]
    lcookie = env['rack.request.cookie_string']
	
    require 'uri'
    require 'net/http'
    uri = URI.parse('http://221.199.209.249:8787/auth-do-sign-in/')
    http = Net::HTTP.new(uri.host, uri.port)

    params = "persist=1&appUri=&clientPath=%2Fauth-sign-in&v=#{encr}"

    headers = {
      'Cookie' => lcookie,
      'Content-Type' => 'application/x-www-form-urlencoded'
   }

   resp, data = http.post(uri.path, params, headers)

requestResponse = ''

if(body.include? 'Incorrect')
	requestResponse = 'Incorrect Username or Password!'
else
#specify cookie
   setCookie = resp['set-cookie']

   index = setCookie.index(';')

   cookie = setCookie[0..index-1]

  gcookie = "#{lcookie}; #{cookie}"

headersInit = {
      'Cookie' => gcookie,
      'Content-Type' => 'application/json',
      'X-RS-ID' => '-1381919328',
      'Connection' => 'keep-alive',
      'Cache-Control' => 'no-cache',
      'Pragma' => 'no-cache'
    }

#client_init

 uri = URI.parse('http://221.199.209.249:8787/rpc/client_init/')
    http = Net::HTTP.new(uri.host, uri.port)

 params = "{\"method\":\"client_init\", \"params\":[], \"version\":0}"
 
   resp, data = http.post(uri.path, params, headersInit)

   response = ''
   resp.each {|key, val| response << key + ' = ' + val + ' '}
  clientId = resp['clientId']
   version = resp['version']
      print "Body: #{resp.body} \n"
   print "data: #{data}"
   print " \nCLIENTID: #{clientId} \n VERSION: #{version} \n"
   print "RESPONSE INIT:\n  #{response}\n"


   

## following requests are not working because initializing the client (getting the client id) ist not working..
## not sure wether only these requests are necessary to restart the session..

#restart
=begin
print "---------------------------RESTART ----------------------"


    uri = URI.parse('http://221.199.209.249:8787/rpc/suspend_for_restart/')
    http = Net::HTTP.new(uri.host, uri.port)

    params = "{\"method\":\"suspend_for_restart\", \"params\":[{\"save_minimal\":true, \"save_workspace\":true, \"exclude_packages\":false}], \"clientId\":\"#{clientId}\", \"version\":#{version}}"

   resp, data = http.post(uri.path, params, headers)

   response = ''
   resp.each {|key, val| response << key + ' = ' + val}
   print "RESPONSE: FOR RESTART:  #{response}"

## ping

print " ----------PING-------------"

   uri = URI.parse('http://221.199.209.249:8787/rpc/ping/')
    http = Net::HTTP.new(uri.host, uri.port)

    params = "{\"method\":\"ping\", \"params\":[], \"clientId\":\"#{clientId}\", \"version\":#{version}}"

    headers = {
      'Cookie' => cookie,
      'Content-Type' => 'application/json'
   }

   resp, data = http.post(uri.path, params, headers)

   response = ''
   resp.each {|key, val| response << key + ' = ' + val}
   print "RESPONSE: FOR PING:  #{response}"

## refresh_plot

print "----------------------REFRESH-----------------------"

uri = URI.parse('http://221.199.209.249:8787/rpc/refresh_plot/')
    http = Net::HTTP.new(uri.host, uri.port)

    params = "{\"method\":\"refresh_plot\", \"params\":[], \"clientId\":\"#{clientId}\", \"version\":#{version}}"

    headers = {
      'Cookie' => cookie,
      'Content-Type' => 'application/json'
   }

   resp, data = http.post(uri.path, params, headers)

   response = ''
   resp.each {|key, val| response << key + ' = ' + val}
   print "RESPONSE: FOR REFRESH:  #{response}"

=end
 requestResponse = response
end

   [200, {}, requestResponse]

  end
  run handler
end





