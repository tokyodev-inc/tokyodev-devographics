## Services

### API

Node.js TypeScript app.

- https://api.surveys.tokyodev.com/

##### What It Does

- Make the outlines of each survey available to the survey form app.
- Connect to the database and generate the data for the results app's charts.
- Provide the internationalisation strings for each locale.

##### Code

- https://github.com/Devographics/Monorepo/tree/main/api2

##### Hosted On

- https://render.com

### GraphiQL

GraphQL IDE

##### What It Does

- Make it easier to test and query the API.

##### Code

- https://github.com/Devographics/Monorepo/tree/main/graphiql

##### Hosted On

- https://netlify.com

##### Domain

- surveyapi.tokyodev.com

### Survey Form

Next.js TypeScript app.

##### What It Does

- Let respondents take the survey.

##### Code

- https://github.com/Devographics/Monorepo/tree/main/surveyform

##### Hosted On

- https://vercel.com

##### Domain

- surveys.tokyodev.com

### Results

Gatsby TypeScript app.

##### What It Does

- Display the survey results.

##### Code

- https://github.com/Devographics/Monorepo/tree/main/results

##### Hosted On

- https://netlify.com

##### Domains

- survey2022.tokyodev.com
- survey2023.tokyodev.com
- etc.

### Main Database

MongoDB database.

##### What It Does

- Store the raw data entered by respondents.
- Store the "normalized" data once it's been processed.

##### Hosted On

- https://www.mongodb.com/atlas/database

### Cache Database

Redis database.

##### What It Does

- Cache the results of queries made to the API app.

##### Hosted On

- https://upstash.com/

### Static Assets

Static image files.

##### What It Does

- Store static images such as logos, social media preview images, etc.

##### Hosted On

- https://render.com/

##### Domains

- assets.surveys.tokyodev.com
