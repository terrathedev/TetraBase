# TetraBase 
<img src="tetrabase-img.png" alt="database photo" width="100"/> <img src="docker-img.png" alt="docker photo" width="100"/>

TetraBase is an experiment with 4 types of databases with a frontend webpage and backend.


I am using BUN insted of NPM because pkg is deprecated and I want to be able to build standalne binaries easily.

Im using express socket.io dockerode
Express: Serves the webpage.
Socket.io: Allows real-time "monitoring" updates (so the page updates without refreshing).
Dockerode: A library that lets Node.js talk to the Docker engine directly.


docker is what sets up the databases and then the app.js serves the webpage and code logic. 
