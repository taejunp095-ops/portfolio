import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

let data = await loadData();

let commits = processCommits(data);

commits.sort(
  (a, b) => a.datetime - b.datetime
);

let filteredCommits = commits;

let commitProgress = 100;

let xScale;

let yScale;

let timeScale = d3
  .scaleTime()
  .domain([
    d3.min(commits, (d) => d.datetime),

    d3.max(commits, (d) => d.datetime),
  ])
  .range([0, 100]);

let commitMaxTime =
  timeScale.invert(commitProgress);

let colors = d3.scaleOrdinal(
  d3.schemeTableau10
);

renderCommitInfo(data, commits);

renderScatterPlot(filteredCommits);

updateFileDisplay(filteredCommits);

generateStorySteps();

initializeSlider();

initializeScrollytelling();

async function loadData() {
  const data = await d3.csv(
    'loc.csv',
    (row) => ({
      ...row,

      line: Number(row.line),

      depth: Number(row.depth),

      length: Number(row.length),

      date: new Date(
        row.date + 'T00:00' + row.timezone
      ),

      datetime: new Date(row.datetime),
    })
  );

  return data;
}

function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];

      let {
        author,
        date,
        time,
        timezone,
        datetime,
      } = first;

      let ret = {
        id: commit,

        url:
          'https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME/commit/' +
          commit,

        author,

        date,

        time,

        timezone,

        datetime,

        hourFrac:
          datetime.getHours() +
          datetime.getMinutes() / 60,

        totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', {
        value: lines,

        writable: false,

        configurable: false,

        enumerable: false,
      });

      return ret;
    });
}

function renderCommitInfo(data, commits) {
  const statsContainer =
    d3.select('#stats');

  const dl = statsContainer
    .append('dl')
    .attr('class', 'stats');

  dl.append('dt')
    .html(
      'Total <abbr title="Lines of Code">LOC</abbr>'
    );

  dl.append('dd').text(data.length);

  dl.append('dt').text('Total commits');

  dl.append('dd').text(commits.length);

  dl.append('dt').text('Number of files');

  dl.append('dd').text(
    d3.group(data, (d) => d.file).size
  );

  dl.append('dt').text(
    'Average line length'
  );

  dl.append('dd').text(
    d3
      .mean(data, (d) => d.length)
      .toFixed(2)
  );

  dl.append('dt').text('Maximum depth');

  dl.append('dd').text(
    d3.max(data, (d) => d.depth)
  );

  dl.append('dt').text('Longest line');

  dl.append('dd').text(
    d3.max(data, (d) => d.length)
  );
}

function renderScatterPlot(commits) {
  const width = 1000;

  const height = 600;

  const margin = {
    top: 10,
    right: 10,
    bottom: 30,
    left: 50,
  };

  const usableArea = {
    top: margin.top,

    right: width - margin.right,

    bottom: height - margin.bottom,

    left: margin.left,

    width:
      width -
      margin.left -
      margin.right,

    height:
      height -
      margin.top -
      margin.bottom,
  };

  const svg = d3
    .select('#chart')
    .append('svg')
    .attr(
      'viewBox',
      `0 0 ${width} ${height}`
    )
    .style('overflow', 'visible');

  xScale = d3
    .scaleTime()
    .domain(
      d3.extent(
        commits,
        (d) => d.datetime
      )
    )
    .range([
      usableArea.left,
      usableArea.right,
    ])
    .nice();

  yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([
      usableArea.bottom,
      usableArea.top,
    ]);

  svg
    .append('g')
    .attr('class', 'gridlines')
    .attr(
      'transform',
      `translate(${usableArea.left},0)`
    )
    .call(
      d3
        .axisLeft(yScale)
        .tickFormat('')
        .tickSize(-usableArea.width)
    );

  const xAxis =
    d3.axisBottom(xScale);

  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat(
      (d) =>
        String(d % 24).padStart(
          2,
          '0'
        ) + ':00'
    );

  svg
    .append('g')
    .attr(
      'transform',
      `translate(0, ${usableArea.bottom})`
    )
    .attr('class', 'x-axis')
    .call(xAxis);

  svg
    .append('g')
    .attr(
      'transform',
      `translate(${usableArea.left},0)`
    )
    .attr('class', 'y-axis')
    .call(yAxis);

  svg
    .append('g')
    .attr('class', 'dots');

  updateScatterPlot(commits);

  function brushed(event) {
    const selection =
      event.selection;

    d3.selectAll('circle').classed(
      'selected',
      (d) =>
        isCommitSelected(
          selection,
          d
        )
    );

    renderSelectionCount(selection);

    renderLanguageBreakdown(selection);
  }

  svg.call(
    d3
      .brush()
      .on(
        'start brush end',
        brushed
      )
  );

  svg
    .selectAll(
      '.dots, .overlay ~ *'
    )
    .raise();

  function isCommitSelected(
    selection,
    commit
  ) {
    if (!selection) {
      return false;
    }

    const [[x0, y0], [x1, y1]] =
      selection;

    const x = xScale(
      commit.datetime
    );

    const y = yScale(
      commit.hourFrac
    );

    return (
      x >= x0 &&
      x <= x1 &&
      y >= y0 &&
      y <= y1
    );
  }
}

function updateScatterPlot(commits) {
  const svg =
    d3.select('#chart svg');

  xScale.domain(
    d3.extent(
      commits,
      (d) => d.datetime
    )
  );

  const xAxis =
    d3.axisBottom(xScale);

  svg
    .select('.x-axis')
    .call(xAxis);

  const [minLines, maxLines] =
    d3.extent(
      commits,
      (d) => d.totalLines
    );

  const rScale = d3
    .scaleSqrt()
    .domain([
      minLines,
      maxLines,
    ])
    .range([2, 30]);

  const sortedCommits = d3.sort(
    commits,
    (d) => -d.totalLines
  );

  svg
    .select('.dots')
    .selectAll('circle')
    .data(
      sortedCommits,
      (d) => d.id
    )
    .join('circle')
    .attr(
      'cx',
      (d) => xScale(d.datetime)
    )
    .attr(
      'cy',
      (d) => yScale(d.hourFrac)
    )
    .attr(
      'r',
      (d) =>
        rScale(d.totalLines)
    )
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)

    .on(
      'mouseenter',
      (event, commit) => {
        d3.select(
          event.currentTarget
        ).style(
          'fill-opacity',
          1
        );

        renderTooltipContent(
          commit
        );

        updateTooltipVisibility(
          true
        );

        updateTooltipPosition(
          event
        );
      }
    )

    .on('mousemove', (event) => {
      updateTooltipPosition(
        event
      );
    })

    .on('mouseleave', (event) => {
      d3.select(
        event.currentTarget
      ).style(
        'fill-opacity',
        0.7
      );

      updateTooltipVisibility(
        false
      );
    });
}

function initializeSlider() {
  d3.select('#commit-progress')
    .on(
      'input',
      onTimeSliderChange
    );

  onTimeSliderChange();
}

function onTimeSliderChange() {
  commitProgress = Number(
    d3
      .select('#commit-progress')
      .property('value')
  );

  commitMaxTime =
    timeScale.invert(commitProgress);

  d3.select('#commit-time-display')
    .text(
      commitMaxTime.toLocaleString(
        'en',
        {
          dateStyle: 'long',
          timeStyle: 'short',
        }
      )
    );

  filteredCommits =
    commits.filter(
      (d) =>
        d.datetime <=
        commitMaxTime
    );

  updateScatterPlot(filteredCommits);

  updateFileDisplay(filteredCommits);
}

function updateFileDisplay(
  commits
) {
  let lines = commits.flatMap(
    (d) => d.lines
  );

  let files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => {
      return { name, lines };
    })
    .sort(
      (a, b) =>
        b.lines.length -
        a.lines.length
    );

  let filesContainer = d3
    .select('#files')
    .selectAll('div')
    .data(files, (d) => d.name)
    .join((enter) =>
      enter
        .append('div')
        .call((div) => {
          div.append('dt');
          div.append('dd');
        })
    );

  filesContainer
    .select('dt')
    .html(
      (d) => `
      <code>${d.name}</code>
      <small>${d.lines.length} lines</small>
    `
    );

  filesContainer
    .select('dd')
    .selectAll('div')
    .data((d) => d.lines)
    .join('div')
    .attr('class', 'loc')
    .attr(
      'style',
      (d) =>
        `--color: ${colors(d.type)}`
    );
}

function generateStorySteps() {
  d3.select('#scatter-story')
    .selectAll('.step')
    .data(commits)
    .join('div')
    .attr('class', 'step')
    .html(
      (d, i) => `
        <p>
          On ${d.datetime.toLocaleString(
            'en',
            {
              dateStyle: 'full',
              timeStyle: 'short',
            }
          )},
          I made
          ${
            i > 0
              ? 'another glorious commit'
              : 'my first glorious commit'
          }.
        </p>

        <p>
          I edited ${d.totalLines} lines across ${
            d3.rollups(
              d.lines,
              (D) => D.length,
              (d) => d.file
            ).length
          } files.
        </p>

        <p>
          Then I looked over all I had made,
          and I saw that it was very good.
        </p>
      `
    );
}

function initializeScrollytelling() {
  function onStepEnter(response) {
    const commit =
      response.element.__data__;

    commitMaxTime = commit.datetime;

    filteredCommits =
      commits.filter(
        (d) =>
          d.datetime <=
          commitMaxTime
      );

    updateScatterPlot(filteredCommits);

    updateFileDisplay(filteredCommits);

    d3.select(
      '#commit-time-display'
    ).text(
      commitMaxTime.toLocaleString(
        'en',
        {
          dateStyle: 'long',
          timeStyle: 'short',
        }
      )
    );
  }

  const scroller = scrollama();

  scroller
    .setup({
      container: '#scrolly-1',
      step: '#scrolly-1 .step',
      offset: 0.5,
    })
    .onStepEnter(onStepEnter);
}

function renderTooltipContent(commit) {
  const link =
    document.getElementById(
      'commit-link'
    );

  const date =
    document.getElementById(
      'commit-date'
    );

  const time =
    document.getElementById(
      'commit-time'
    );

  const author =
    document.getElementById(
      'commit-author'
    );

  const lines =
    document.getElementById(
      'commit-lines'
    );

  if (
    Object.keys(commit).length === 0
  ) {
    return;
  }

  link.href = commit.url;

  link.textContent = commit.id;

  date.textContent =
    commit.datetime?.toLocaleDateString(
      'en',
      {
        dateStyle: 'full',
      }
    );

  time.textContent =
    commit.datetime?.toLocaleTimeString();

  author.textContent =
    commit.author;

  lines.textContent =
    commit.totalLines;
}

function updateTooltipVisibility(
  isVisible
) {
  const tooltip =
    document.getElementById(
      'commit-tooltip'
    );

  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(
  event
) {
  const tooltip =
    document.getElementById(
      'commit-tooltip'
    );

  tooltip.style.left = `${
    event.clientX + 10
  }px`;

  tooltip.style.top = `${
    event.clientY + 10
  }px`;
}

function renderSelectionCount(
  selection
) {
  const selectedCommits =
    selection
      ? commits.filter((d) =>
          isCommitSelectedGlobal(
            selection,
            d
          )
        )
      : [];

  const countElement =
    document.querySelector(
      '#selection-count'
    );

  countElement.textContent = `${
    selectedCommits.length ||
    'No'
  } commits selected`;

  return selectedCommits;
}

function renderLanguageBreakdown(
  selection
) {
  const selectedCommits =
    selection
      ? commits.filter((d) =>
          isCommitSelectedGlobal(
            selection,
            d
          )
        )
      : [];

  const container =
    document.getElementById(
      'language-breakdown'
    );

  if (
    selectedCommits.length === 0
  ) {
    container.innerHTML = '';

    return;
  }

  const lines =
    selectedCommits.flatMap(
      (d) => d.lines
    );

  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type
  );

  container.innerHTML = '';

  for (const [
    language,
    count,
  ] of breakdown) {
    const proportion =
      count / lines.length;

    const formatted =
      d3.format('.1~%')(
        proportion
      );

    container.innerHTML += `
      <dt>${language}</dt>
      <dd>
        ${count} lines (${formatted})
      </dd>
    `;
  }
}

function isCommitSelectedGlobal(
  selection,
  commit
) {
  if (!selection) {
    return false;
  }

  const circles = d3
    .selectAll('circle')
    .nodes();

  const circle = circles.find(
    (c) => c.__data__ === commit
  );

  if (!circle) {
    return false;
  }

  const x = Number(
    circle.getAttribute('cx')
  );

  const y = Number(
    circle.getAttribute('cy')
  );

  const [[x0, y0], [x1, y1]] =
    selection;

  return (
    x >= x0 &&
    x <= x1 &&
    y >= y0 &&
    y <= y1
  );
}