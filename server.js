const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const docusign = require('docusign-esign');
const dotenv = require('dotenv').config({ path: './.env' });
const fs = require('fs');
const session = require('express-session');

const port = 8000;

const app = express();

app.use(express.static('public'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(
	session({
		secret: 'asd124efajf',
		resave: true,
		saveUninitialized: true,
	})
);

app.post('/form', async (request, response) => {
	await checkToken(request);

	console.log('inenvelopeapi>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
	let dsApiClient = new docusign.ApiClient();
	dsApiClient.setBasePath(process.env.BASE_PATH);
	dsApiClient.addDefaultHeader(
		'Authorization',
		'Bearer ' + request.session.access_token
	);

	let envelopesApi = new docusign.EnvelopesApi(dsApiClient);

	// Make the envelope request body
	let envelope = makeEnvelope(request.body.name, request.body.email);

	// Call Envelopes::create API method
	// Exceptions will be caught by the calling function
	let results = await envelopesApi.createEnvelope(process.env.ACCOUNT_ID, {
		envelopeDefinition: envelope,
	});

	console.log(results.status);

	console.log('form received', request.body);
	if (results.status === 'sent') {
		response.sendFile(__dirname + '/success.html');
	} else {
		response.sendFile(__dirname + '/failure.html');
	}
	// response.send('received');
	console.log('outofenvelopeapi>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
	return results;
});

function getEnvelopesapi(request) {
	console.log('inenvelopeapi>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
	let dsApiClient = new docusign.ApiClient();
	dsApiClient.setBasePath(process.env.BASE_PATH);
	dsApiClient.addDefaultHeader(
		'Authorization',
		'Bearer ' + request.session.access_token
	);
	console.log('outofenvelopeapi>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
	return new docusign.EnvelopesApi(dsApiClient);
}

function makeEnvelope(name, email) {
	// Create the envelope definition
	let env = new docusign.EnvelopeDefinition();
	env.templateId = process.env.TEMPLATE_ID;

	// Create template role elements to connect the signer and cc recipients
	// to the template
	// We're setting the parameters via the object creation
	let signer1 = docusign.TemplateRole.constructFromObject({
		email: email,
		name: name,

		roleName: 'Applicant',
	});

	// Add the TemplateRole objects to the envelope object
	env.templateRoles = [signer1];
	env.status = 'sent'; // We want the envelope to be sent

	return env;
}

async function checkToken(request) {
	console.log('inckeckout token>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
	if (request.session.access_token && Date.now() < request.session.expires_at) {
		console.log(
			're-using access token>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>',
			request.session.access_token
		);
	} else {
		console.log(
			'generating a new access token>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>'
		);
		// console.log(request.session.expires_at);
		let dsApiClient = new docusign.ApiClient();
		dsApiClient.setBasePath(process.env.BASE_PATH);
		const results = await dsApiClient.requestJWTUserToken(
			process.env.INTEGRATION_KEY,
			process.env.USER_ID,
			'signature',
			// fs.readFileSync(path.join(__dirname, 'secret.key')),
			process.env.PRIVATE_KEY,
			3600
		);
		console.log(results.body);
		request.session.access_token = results.body.access_token;
		request.session.expires_at =
			Date.now() + (results.body.expires_in - 60) * 1000;
		console.log('outofckeckout token>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
	}
}

app.post('/', (request, response) => {
	response.sendFile(__dirname + '/sendmail.html');
});

app.get('/', async function (request, response) {
	await checkToken(request);
	response.sendFile(path.join(__dirname, 'sendmail.html'));
});

// account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=514b20d0-0707-4081-a270-6df9c329a692 &redirect_uri=http://localhost:5000/

app.listen(process.env.PORT || port, () => {
	console.log('the app is listening on port:8000', process.env.USER_ID);
});
