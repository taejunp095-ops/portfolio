import { fetchJSON, renderProjects } from './global.js';

// load all projects
const projects = await fetchJSON('./lib/projects.json');

// take only first 3
const latestProjects = projects.slice(0, 3);

// find container on homepage
const projectsContainer = document.querySelector('.projects');

// render them
if (latestProjects && projectsContainer) {
  renderProjects(latestProjects, projectsContainer, 'h2');
}