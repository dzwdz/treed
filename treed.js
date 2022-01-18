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
		return res.json();
	}
}

function createElementObj(type, obj) {
	return Object.assign(document.createElement(type), obj);
}

if (!localStorage.access_token) alert("set localStorage.access_token");
let masto = new Mastodon("https://tilde.zone", localStorage.access_token);

let currentDay = {};
let max_id = null;
let daysLeft = 4; // TODO does a day limit even make sense? there seems to be a hard cap of posts at 400
let alreadyLoaded = 0;

// posts MUST be passed from newest to oldest // TODO assert
function handlePost(post) {
	console.log(post);
	const date = post.created_at.split('T')[0];
	const acct = post.account.acct;
	alreadyLoaded++;
	max_id = post.id;

	if (date != currentDay.date) { // advance day
		daysLeft--;
		currentDay = expandable();
		currentDay.header.innerText = date;
		currentDay.date = date;
		currentDay.people = {};

		document.getElementById('main').appendChild(currentDay);
	}

	if (!currentDay.people[acct]) {
		const el = expandable();

		el.header.innerText = acct;
		el.header.countEl = el.header.appendChild(createElementObj('snap'));
		el.header.appendChild(
			createElementObj('img', {
				classList: 'avatar',
				src: post.account.avatar_static,}));

		currentDay.inner.appendChild(el);
		currentDay.people[acct] = el;
	}

	const toot = createElementObj('div', {classList: 'toot'});
	if (post.reblog) {
		post = post.reblog;
		const reblog = createElementObj('div', {classList: 'reblog'});
		reblog.innerText = post.account.acct;
		reblog.appendChild(
			createElementObj('img', {
				classList: 'avatar',
				src: post.account.avatar_static,}));
		toot.appendChild(reblog);
	}
	toot.innerHTML += post.content;
	post.media_attachments.forEach(m => {
		toot.appendChild(
			createElementObj('img', {
				src: m.preview_url,
				alt: m.description,
				title: m.description}));
	});

	currentDay.people[acct].inner.prepend(toot);

	// update toot amt
	const p = currentDay.people[acct];
	p.header.countEl.innerText = ` (${p.inner.children.length})`;
}

function loadingStatus(str) {
	document.getElementById('status').innerText = str;
}

function getPage() {
	let opts = {limit: 100};
	if (max_id) opts.max_id = max_id;
	loadingStatus(`have ${alreadyLoaded}, loading more... (${daysLeft} days left)}`);

	masto.get("/api/v1/timelines/home", opts)
		.then(posts => {
			posts.forEach(handlePost);
			loadingStatus(`have ${alreadyLoaded}, done for now`);
			if (posts.length && daysLeft >= 0) getPage();
		});
}

function expandable() {
	let e = createElementObj('div', {classList: 'expand'});
	e.header = e.appendChild(createElementObj('div', {classList: 'expand-header'}));
	e.inner  = e.appendChild(createElementObj('div', {classList: 'expand-inner', hidden: true}));
	e.header.onclick = () => e.inner.toggleAttribute('hidden');
	return e;
}

getPage();
