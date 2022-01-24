let i = document.getElementById('token');
let b = document.getElementById('token-btn');
i.value = localStorage.access_token;

function updateDirty() {
	let dirty = i.value != localStorage.access_token;
	b.disabled = !dirty;
}

i.oninput = updateDirty;
b.onclick = () => {
	localStorage.access_token = i.value;
	updateDirty();
};

updateDirty();

