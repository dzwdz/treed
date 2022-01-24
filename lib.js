class Mastodon {
	constructor(instance, token) {
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
}

function createElementObj(type, obj) {
	return Object.assign(document.createElement(type), obj);
}
