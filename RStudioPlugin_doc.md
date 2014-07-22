# R Studio Plugin
The goal is to login the user into RStudio and loading the data of the experiment so that the user has immediate access to it.
In order to do that, the session has to be restarted whereby a script is executed that loads the data.

To achieve this several steps are necessary:
  1. Getting the public key from the server
     * works - currently implemented in config.ru and called by experiment_monitor.js
  2. Logging in the user and getting the 'Set-Cookie' attribute 
     * Username + password need to be encoded with the public key (implemented in experiment_monitor.js, method: encrypt )
     * The logging in is implemented in config.ru and is called by experiment_monitor.js
  3. Initializing the user (client_init) to get a valid client-id (not working)
     * When doing the request in javascript with ajax, it is not working at all, the 'POST' becames 'OPTIONS' according to Chrome Developer Tools
         * Only the case when the Content-Type in the header is set, otherwise it's a 'POST' but then the data (json) is apparently not interpreted correctly
     * When doing the request in config.ru the post is working but the reply is 'Invalid client-id' although this is the post to get the client-id in the first place...
         * The cookie should be correct and transferred correctly (not an encoding problem) because when the cookie is altered slightly the answer is 'User Unauthorized'
  4. Different Posts to restart the session which all require the client-id..
  5. To load the data by the restart of the session:
     * Putting a load <file> command in the 'start - script'
     * Putting the data of the experiment in that <file> (via 'dump')

In addition a configuration file is needed that specifies username, password, server-url of RStudio,.. and methods to transfer these information to javascript.