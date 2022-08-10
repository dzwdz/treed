if (!localStorage.instance || !localStorage.access_token)
	window.location = 'login.html';
let masto = new Mastodon(localStorage.instance, localStorage.access_token);

let currentDay = null;

let tree = {};
let mainEl = document.getElementById('main');


function insertIfMissing(parent, key, sortFn, elFn) {
	if (!parent.fwChildren) parent.fwChildren = {};
	let collection = parent.fwChildren;
	if (!collection[key]) {
		let el = elFn()
		collection[key] = el;
		let others = sortFn(Object.keys(collection));
		let firstBigger = collection[others[others.indexOf(key) + 1]];
		parent.insertBefore(el, firstBigger);
	}
	return collection[key];
}

function nickCompare(a, b) {
	let isLocal = (nick) => nick.indexOf('@') == -1;
	if (isLocal(a) && !isLocal(b)) return -1;
	if (!isLocal(a) && isLocal(b)) return 1;
	if (a < b) return -1;
	if (a > b) return 1;
	return 0;
}

// TODO somehow indicate that a tree has finished loading / show newly loaded posts
function renderTree() {
	for (const date in tree) {
		let dayEl = insertIfMissing(mainEl, date, a => a.sort().reverse(), () => {
			let currentDay = createElementObj('div', {
				classList: 'day',
			});
			// TODO if there's only one day available this won't display anything
			currentDay.hidden = date != Object.keys(tree).sort().reverse()[1];

			let header = createElementObj('div', {
				innerText: ' ' + date + ' ',
				classList: 'day-header',
			});
			header.prepend(createElementObj('a', {
				innerText: 'before',
				classList: 'next-day',
				href: '#',
				onclick: () => {
					let next = currentDay.nextSibling;
					if (next) {
						currentDay.hidden = true;
						next.hidden = false;
					}
				},
			}));
			header.append(createElementObj('a', {
				innerText: 'after',
				classList: 'prev-day',
				href: '#',
				onclick: () => {
					let next = currentDay.previousSibling;
					if (next) {
						currentDay.hidden = true;
						next.hidden = false;
					}
				},
			}));
			currentDay.appendChild(header);
			return currentDay;
		});

		for (const acct in tree[date]) {
			let acctEl = insertIfMissing(dayEl, acct, a => a.sort(nickCompare), () => {
				const el = createElementObj('div', {classList: 'expand'});
				el.header = el.appendChild(createElementObj('div', {
					classList: 'expand-header',
					onclick: () => el.inner.toggleAttribute('hidden'),
					innerText: acct,
				}));
				el.header.countEl = el.header.appendChild(createElementObj('snap'));

				el.header.appendChild(createElementObj('img', {
					classList: 'avatar',
					src: Object.values(tree[date][acct])[0].account.avatar_static,
				}));
				el.inner = el.appendChild(createElementObj('div', {classList: 'expand-inner', hidden: true}));
				return el;
			});

			for (const tootId in tree[date][acct]) {
				insertIfMissing(acctEl.inner, tootId, a => a.sort().reverse(), () => {
					let post = tree[date][acct][tootId];
					const toot = createElementObj('div', {classList: 'toot'});
					if (post.reblog) {
						post = post.reblog;
						const reblog = createElementObj('div', {classList: 'reblog'});
						reblog.innerText = post.account.acct;
						// TODO stop images from preloading to save bandwidth and prevent 429
						reblog.appendChild(
							createElementObj('img', {
								classList: 'avatar',
								src: post.account.avatar_static,}));
						toot.appendChild(reblog);
					}
					if (post.in_reply_to_id) {
						toot.appendChild(createElementObj('div', {
							classList: 'reply',
							innerText: 'reply', /* TODO link to full thread view */
						}));
					}
					toot.innerHTML += post.content;
					post.media_attachments.forEach(m => {
						toot.appendChild(
							createElementObj('img', {
								src: m.preview_url,
								alt: m.description,
								title: m.description}));
					});
					return toot;
				});
				acctEl.header.countEl.innerText = ` (${acctEl.inner.children.length})`;
			}
		}
	}
}

function handlePost(post) {
	const date = post.created_at.split('T')[0];
	const acct = post.account.acct;
	if (!tree[date]) tree[date] = {};
	if (!tree[date][acct]) tree[date][acct] = {};
	tree[date][acct][post.id] = post;
	renderTree();
}

function loadingStatus(str) {
	document.getElementById('status').innerText = str;
}

function treeIds() {
	return Object.values(tree).flatMap(Object.values).flatMap(Object.keys).sort();
}

function updateTree() {
	// TODO does a day limit even make sense? there seems to be a hard cap of posts at 400
	let daysLeft = 4;

	let idTarget = treeIds().reverse()[0]; // max id

	async function getPage(max_id = null) {
		let opts = {limit: 100};
		if (max_id) opts.max_id = max_id;
		loadingStatus(`have ${treeIds().length}, loading more... (${daysLeft} days left)`);

		let posts = await masto.get("/api/v1/timelines/home", opts)
		posts.forEach(handlePost);

		if (posts.length)
			max_id = posts[posts.length - 1].id;

		if ((!idTarget || max_id > idTarget) && posts.length && daysLeft >= 0)
			await getPage(max_id);
		else
			loadingStatus(`have ${treeIds().length}, done for now`);
	}

	getPage()
		.catch((e) => {
			if (e == 401) { // shit tier error handling
				alert("Invalid access token. Check your settings.")
			}
			console.log(e);
		}).then(() => {
			console.log("done? saving tree");
			localStorage.tree = JSON.stringify(tree);
		});
}

function pruneTree() {
	let maxDays = 5;
	let toDelete = Object.keys(tree).sort().reverse().slice(maxDays);
	toDelete.forEach(d => delete tree[d]);
}

try {
	tree = JSON.parse(localStorage.tree);
	pruneTree();
} catch {}
// TODO compress
updateTree();
