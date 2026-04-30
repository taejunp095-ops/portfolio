import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');

let selectedYear = null;
let query = '';

const projectsContainer = document.querySelector('.projects');
const searchBar = document.querySelector('.searchBar');
const svg = d3.select('#projects-pie-plot');
const legend = d3.select('.legend');
const projectsTitle = document.querySelector('.projects-title');

projectsTitle.textContent = `Projects (${projects.length})`;

const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
const colors = d3.scaleOrdinal(d3.schemeTableau10);

function getVisibleProjects() {
  return projects.filter((project) => {
    const values = Object.values(project).join('\n').toLowerCase();
    const matchesSearch = values.includes(query.toLowerCase());

    const matchesYear =
      selectedYear === null || String(project.year) === String(selectedYear);

    return matchesSearch && matchesYear;
  });
}

function updateProjects() {
  const visibleProjects = getVisibleProjects();

  renderProjects(visibleProjects, projectsContainer, 'h2');

  projectsTitle.textContent = `Projects (${visibleProjects.length})`;
}

function updatePieChart() {
  const visibleProjectsForPie = projects.filter((project) => {
    const values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query.toLowerCase());
  });

  const rolledData = d3.rollups(
    visibleProjectsForPie,
    (v) => v.length,
    (d) => d.year
  );

  const data = rolledData.map(([year, count]) => ({ year, count }));

  const sliceGenerator = d3.pie().value((d) => d.count);
  const arcData = sliceGenerator(data);

  colors.domain(data.map((d) => d.year));

  svg
    .selectAll('path')
    .data(arcData)
    .join('path')
    .attr('d', arcGenerator)
    .attr('fill', (d) => colors(d.data.year))
    .attr('class', (d) =>
      String(d.data.year) === String(selectedYear) ? 'selected' : ''
    )
    .on('click', (event, d) => {
      const year = d.data.year;

      selectedYear = String(selectedYear) === String(year) ? null : year;

      updateProjects();
      updatePieChart();
    });

  legend
    .selectAll('li')
    .data(data)
    .join('li')
    .attr('class', (d) =>
      String(d.year) === String(selectedYear) ? 'selected' : ''
    )
    .html((d) => `
      <span class="swatch" style="background-color: ${colors(d.year)}"></span>
      ${d.year} <em>(${d.count})</em>
    `);
}

searchBar.addEventListener('input', (event) => {
  query = event.target.value;
  selectedYear = null;

  updateProjects();
  updatePieChart();
});

updateProjects();
updatePieChart();