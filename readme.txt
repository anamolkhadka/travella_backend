How to run the server with manual Flight alert implementation ?
- npm run start




How to run the server along with the push notification for the FlightAware alert system ? (Implemented but not used due to API limitation for Alert system)

FlightAware locks alerts behind their $100/month Standard Tier or Premium Tier.

- Run "npm run tunnel" in one terminal.     # Sets BACKEND_URL in .env
- Run "npm run start" in second terminal.   # Starts your local server on port 3000

To End the tunnel
- npx ngrok kill or Ctrl + C

To track the incoming requests in the web dashboard.
- http://localhost:4040/inspect/http

FlightAware locks alerts behind their $100/month Standard Tier or Premium Tier.