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

  let rolledData = d3.rollups(
    visibleProjectsForPie,
    (v) => v.length,
    (d) => d.year
  );

  const data = rolledData.map(([year, count]) => {
    return { value: count, label: year };
  });

  const sliceGenerator = d3.pie().value((d) => d.value);
  const arcData = sliceGenerator(data);

  colors.domain(data.map((d) => d.label));

  svg
    .selectAll('path')
    .data(arcData)
    .join('path')
    .attr('d', arcGenerator)
    .attr('fill', (d) => colors(d.data.label))
    .attr('class', (d) =>
      String(d.data.label) === String(selectedYear) ? 'selected' : ''
    )
    .on('click', (event, d) => {
      const year = d.data.label;

      selectedYear = String(selectedYear) === String(year) ? null : year;

      updateProjects();
      updatePieChart();
    });

  legend
    .selectAll('li')
    .data(data)
    .join('li')
    .attr('class', (d) =>
      String(d.label) === String(selectedYear) ? 'selected' : ''
    )
    .attr('style', (d) => `--color:${colors(d.label)}`)
    .html((d) => `
      <span class="swatch"></span>
      ${d.label} <em>(${d.value})</em>
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