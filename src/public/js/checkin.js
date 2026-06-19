(function () {
  const searchInput = document.getElementById('memberSearch');
  const resultsBox = document.getElementById('searchResults');
  const memberIdInput = document.getElementById('memberId');
  const submitBtn = document.getElementById('submitBtn');

  let debounceTimer = null;

  function renderResults(members) {
    resultsBox.innerHTML = '';
    members.forEach((m) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'list-group-item list-group-item-action';
      item.textContent = m.full_name;
      item.addEventListener('click', () => {
        searchInput.value = m.full_name;
        memberIdInput.value = m.id;
        submitBtn.disabled = false;
        resultsBox.innerHTML = '';
      });
      resultsBox.appendChild(item);
    });
  }

  searchInput.addEventListener('input', () => {
    submitBtn.disabled = true;
    memberIdInput.value = '';
    const term = searchInput.value.trim();

    clearTimeout(debounceTimer);
    if (term.length < 2) {
      resultsBox.innerHTML = '';
      return;
    }

    debounceTimer = setTimeout(async () => {
      const res = await fetch(`/checkin/search?q=${encodeURIComponent(term)}`);
      const members = await res.json();
      renderResults(members);
    }, 250);
  });
})();
