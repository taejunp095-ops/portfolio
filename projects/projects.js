import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');

renderProjects(projects, projectsContainer, 'h2');

const projectsTitle = document.querySelector('.projects-title');
projectsTitle.textContent = `Projects (${projects.length})`;



let projects = await fetchJSON('../lib/projects.json');

let selectedYear = null;
let query = '';

const projectsContainer = document.querySelector('.projects');
const searchBar = document.querySelector('.searchBar');
const svg = d3.select('#projects-pie-plot');
const legend = d3.select('.legend');

const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
const colors = d3.scaleOrdinal(d3.schemeTableau10);

function getVisibleProjects() {
  return projects.filter((project) => {
    let values = Object.values(project).join('\n').toLowerCase();
    let matchesSearch = values.includes(query.toLowerCase());

    let matchesYear =
      selectedYear === null || String(project.year) === String(selectedYear);

    return matchesSearch && matchesYear;
  });
}

function updateProjects() {
  let visibleProjects = getVisibleProjects();
  projectsContainer.innerHTML = '';
  renderProjects(visibleProjects, projectsContainer, 'h2');
}

function updatePieChart() {
  let visibleProjectsForPie = projects.filter((project) => {
    let values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query.toLowerCase());
  });

  let rolledData = d3.rollups(
    visibleProjectsForPie,
    (v) => v.length,
    (d) => d.year
  );

  let data = rolledData.map(([year, count]) => {
    return { year, count };
  });

  let sliceGenerator = d3.pie().value((d) => d.count);
  let arcData = sliceGenerator(data);

  colors.domain(data.map((d) => d.year));

  svg.selectAll('path').remove();

  svg
    .selectAll('path')
    .data(arcData)
    .join('path')
    .attr('d', arcGenerator)
    .attr('fill', (d) => colors(d.data.year))
    .attr('class', (d) => {
      return String(d.data.year) === String(selectedYear) ? 'selected' : '';
    })
    .on('click', (event, d) => {
      let year = d.data.year;

      if (String(selectedYear) === String(year)) {
        selectedYear = null;
      } else {
        selectedYear = year;
      }

      updateProjects();
      updatePieChart();
    });

  legend.selectAll('li').remove();

  legend
    .selectAll('li')
    .data(data)
    .join('li')
    .attr('class', (d) => {
      return String(d.year) === String(selectedYear) ? 'selected' : '';
    })
    .html((d) => {
      return `
        <span class="swatch" style="background-color: ${colors(d.year)}"></span>
        ${d.year} <em>(${d.count})</em>
      `;
    });
}

searchBar.addEventListener('input', (event) => {
  query = event.target.value;

  updateProjects();
  updatePieChart();
});

updateProjects();
updatePieChart();