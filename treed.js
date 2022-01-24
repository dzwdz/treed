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
}

function createElementObj(type, obj) {
	return Object.assign(document.createElement(type), obj);
}

if (!localStorage.access_token) window.location = 'options.html';
let masto = new Mastodon("https://tilde.zone", localStorage.access_token);

let currentDay = {};
let daysLeft = 4; // TODO does a day limit even make sense? there seems to be a hard cap of posts at 400
let dayIdx = -1;

// posts MUST be passed from newest to oldest // TODO assert
function handlePost(post) {
	console.log(post);
	const date = post.created_at.split('T')[0];
	const acct = post.account.acct;

	if (date != currentDay.date) { // advance day
		daysLeft--;
		dayIdx++;
		currentDay = createElementObj('div', {classList: 'day'});
		currentDay.date = date;
		currentDay.people = {};
		currentDay.hidden = dayIdx != 1;
		let capture = currentDay;

		let header = createElementObj('div', {
			innerText: ' ' + date + ' ',
			classList: 'day-header',
		});
		header.prepend(createElementObj('a', {
			innerText: 'prev',
			classList: 'prev-day',
			href: '#',
			onclick: () => {
				let next = capture.previousSibling;
				if (next) {
					capture.hidden = true;
					next.hidden = false;
				}
			}
		}));
		header.append(createElementObj('a', {
			innerText: 'next',
			classList: 'next-day',
			href: '#',
			onclick: () => {
				let next = capture.nextSibling;
				if (next) {
					capture.hidden = true;
					next.hidden = false;
				}
			}
		}));
		currentDay.appendChild(header);

		document.getElementById('main').appendChild(currentDay);
	}

	if (!currentDay.people[acct]) {
		const el = createElementObj('div', {classList: 'expand'});
		el.header = el.appendChild(createElementObj('div', {
			classList: 'expand-header',
			onclick: () => el.inner.toggleAttribute('hidden'),
			innerText: acct,
		}));
		el.header.countEl = el.header.appendChild(createElementObj('snap'));
		el.header.appendChild(
			createElementObj('img', {
				classList: 'avatar',
				src: post.account.avatar_static,}));
		el.inner  = el.appendChild(createElementObj('div', {classList: 'expand-inner', hidden: true}));

		currentDay.appendChild(el);
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

async function getPage(running_total = 0, max_id = null) {
	let opts = {limit: 100};
	if (max_id) opts.max_id = max_id;
	loadingStatus(`have ${running_total}, loading more... (${daysLeft} days left)`);

	let posts = await masto.get("/api/v1/timelines/home", opts)
	posts.forEach(handlePost);

	max_id = posts[posts.length - 1].id;
	running_total += posts.length;

	if (posts.length && daysLeft >= 0)
		await getPage(running_total, max_id);
	else
		loadingStatus(`have ${running_total}, done for now`);
}

getPage()
	.catch((e) => {
		if (e == 401) { // shit tier error handling
			alert("Invalid access token. Check your settings.")
		}
	});
