class Mastodon {
	constructor(instance, token) {
		if (instance.indexOf('://') == -1)
			instance = 'https://' + instance;
		this.instance = instance;
		this.token = token;
	}

	async get(endpoint, options) {
		let url = this.instance + endpoint + '?' + new URLSearchParams(options);
		const res = await fetch(url, {
			headers: {
				'Authorization': 'Bearer ' + this.token,
			},
		});
		console.log(res);
		if (res.status == 401) {
			throw 401;
		}
		return res.json();
	}

	async post(endpoint, body) {
		const fd = new FormData();
		for (let key in body) fd.append(key, body[key]);
		const res = await fetch(this.instance + endpoint, {
			method: 'POST',
			body: fd,
		});
		return res.json();
	}

	async oauth_login() {
		let redir = window.location.href;
		redir = redir.substr(0, redir.lastIndexOf('/')) + '/oauth.html';

		let res = await this.post('/api/v1/apps', {
			client_name: 'Treed',
			redirect_uris: redir,
			scopes: 'read',
			website: 'https://github.com/dzwdz/treed',
		});
		localStorage.oauth = JSON.stringify(res);
		window.location = this.instance + '/oauth/authorize?' + new URLSearchParams({
			client_id: res.client_id,
			scope: 'read',
			redirect_uri: redir,
			response_type: 'code'
		});
	}
}

function createElementObj(type, obj) {
	return Object.assign(document.createElement(type), obj);
}
