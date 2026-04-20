import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

// ---------- Projects ----------
const projects = await fetchJSON('./lib/projects.json');

const projectsContainer = document.querySelector('.projects');

if (projects && projectsContainer) {
  const latestProjects = projects.slice(0, 3);
  renderProjects(latestProjects, projectsContainer, 'h2');
}

// ---------- GitHub ----------
const githubData = await fetchGitHubData('taejunp095-ops'); // change if needed

console.log('githubData:', githubData);

const profileStats = document.querySelector('#profile-stats');

if (githubData && profileStats) {
  profileStats.innerHTML = `
    <dl>
      <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
      <dt>Public Gists:</dt><dd>${githubData.public_gists}</dd>
      <dt>Followers:</dt><dd>${githubData.followers}</dd>
      <dt>Following:</dt><dd>${githubData.following}</dd>
    </dl>
  `;
}