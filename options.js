function input_localStorage(iId, bId, lId) {
	let i = document.getElementById(iId);
	let b = document.getElementById(bId);
	i.value = localStorage[lId];

	function updateDirty() {
		let dirty = i.value != localStorage[lId];
		b.disabled = !dirty;
	}

	i.oninput = updateDirty;
	b.onclick = () => {
		localStorage[lId] = i.value;
		updateDirty();
	};

	updateDirty();
}

input_localStorage('instance', 'instance-btn', 'instance');
input_localStorage('token', 'token-btn', 'access_token');

document.getElementById('oauth-btn').onclick = (async () => {
	let redir = window.location.href;
	redir = redir.substr(0, redir.lastIndexOf('/')) + '/oauth.html';

	let masto = new Mastodon(localStorage.instance, null);
	let res = await masto.post('/api/v1/apps', {
		client_name: 'Treed',
		redirect_uris: redir,
		scopes: 'read',
		website: 'https://github.com/dzwdz/treed',
	});
	localStorage.oauth = JSON.stringify(res);
	window.location = localStorage.instance + '/oauth/authorize?' + new URLSearchParams({
		client_id: res.client_id,
		scope: 'read',
		redirect_uri: redir,
		response_type: 'code'
	});
});

