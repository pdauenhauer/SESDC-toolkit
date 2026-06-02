import SESDCHeader from '../components/SESDCHeader';
import SESDCFooter from '../components/SESDCFooter';
import '../css/userGuide.css';

function UserGuide() {
  return (
    <div>
      <SESDCHeader />

      <div class="guide-main-content">
        <h1 id="page-title">Microgrid Toolkit User Guide</h1>
        <p class="guide-subtitle">This guide walks through accessing the tool, creating projects, configuring microgrids, running simulations, and analyzing results.</p>
        <hr class="guide-divider" />

        {/* TABLE OF CONTENTS */}
        <div class="guide-toc">
          <h2 class="guide-toc-heading">Table of contents</h2>
          <ul class="guide-toc-list">
            <li>
              <a href="#section1">Introduction</a>
              <ul>
                <li><a href="#section1a">Purpose</a></li>
                <li><a href="#section1b">Who it's for</a></li>
                <li><a href="#section1d">Benefits of the Tool</a></li>
                <li><a href="#section1e">Accessing the Tool</a></li>
                <li><a href="#section1f">Supported Browsers</a></li>
                <li><a href="#section1g">Mobile/Desktop Compatibility</a></li>
              </ul>
            </li>
            <li>
              <a href="#section2">Getting Started</a>
              <ul>
                <li><a href="#section2a">Creating an Account &amp; Logging in</a></li>
                <li><a href="#section2b">Navigating Dashboard</a></li>
                <li><a href="#section2c">Starting a New Project</a></li>
              </ul>
            </li>
            <li>
              <a href="#section3">Configuring a Microgrid</a>
              <ul>
                <li><a href="#section3a">Defining energy loads</a></li>
                <li><a href="#section3b">Selecting energy sources</a></li>
                <li><a href="#section3c">Set location and environmental data</a></li>
                <li><a href="#section3d">Simulation settings</a></li>
              </ul>
            </li>
            <li>
              <a href="#section4">Simulation</a>
              <ul>
                <li><a href="#section4a">How to start</a></li>
                <li><a href="#section4b">Returning after changes</a></li>
                <li><a href="#section4c">API Information</a></li>
              </ul>
            </li>
            <li>
              <a href="#section5">Analysis</a>
              <ul>
                <li><a href="#section5a">Visual outputs</a></li>
                <li><a href="#section5b">Energy Balance</a></li>
                <li><a href="#section5c">Reliability metrics</a></li>
              </ul>
            </li>
            <li><a href="#section6">Cost &amp; Economic Analysis</a></li>
            <li>
              <a href="#section7">Saving and Exporting</a>
              <ul>
                <li><a href="#section7a">Saving project progress</a></li>
                <li><a href="#section7b">Exporting to PDF/CSV</a></li>
              </ul>
            </li>
            <li><a href="#section8">Example Project</a></li>
            <li>
              <a href="#section9">Troubleshooting &amp; FAQ</a>
              <ul>
                <li><a href="#section9a">Common errors</a></li>
                <li><a href="#section9b">Reporting bugs or feedback</a></li>
                <li><a href="#section9c">Contact/support link</a></li>
              </ul>
            </li>
          </ul>
        </div>

        {/* INTRODUCTION */}
        <h2 id="section1">Introduction</h2>
        <p>Welcome to the Microgrid Design Tool User Guide. This guide will walk you through everything you need to know to get started, from accessing the tool and creating your first project, to configuring system settings, running simulations, and analyzing results. Whether you're a first-time user or looking to deepen your understanding, this guide is designed to support you at every step.</p>

        <h3 id="section1a">Purpose</h3>
        <p>The microgrid design tool empowers users to simulate and evaluate custom off-grid energy systems based on real-world scenarios. It allows for detailed configuration of electrical loads, energy sources, and supplemental power options to generate cost, performance, and sustainability insights.</p>

        <h3 id="section1b">Who it's for</h3>
        <p>This tool is designed for users with an interest in renewable energy planning, including non-engineers, community leaders, students, and project developers. No prior technical background is required, our interface is built to be accessible and intuitive for anyone passionate about clean energy solutions.</p>

        <h3 id="section1d">Benefits of the Tool</h3>
        <ul>
          <li><strong>Custom Design:</strong> Build microgrid systems tailored to specific locations and energy needs</li>
          <li><strong>Real-Time Simulation:</strong> Evaluate system behavior across different seasons and conditions</li>
          <li><strong>Financial Insights:</strong> Receive automatic cost breakdowns and economic impact projections</li>
          <li><strong>Scenario Comparison:</strong> Save and duplicate designs for iterative planning or presentations</li>
          <li><strong>Sustainability Focus:</strong> Model diesel supplementation, emissions, and renewable percentages</li>
        </ul>

        <h3 id="section1e">Accessing the Tool</h3>
        <p>The tool is accessible online at <a href="https://sesdc-toolkit.com/" target="_blank">https://sesdc-toolkit.com/</a>. No download is required. Users must create an account to begin designing.</p>

        <h3 id="section1f">Supported Browsers</h3>
        <ul>
          <li>Google Chrome</li>
          <li>Mozilla Firefox</li>
          <li>Microsoft Edge</li>
          <li>Safari</li>
        </ul>

        <h3 id="section1g">Mobile/Desktop Compatibility</h3>
        <p>The tool is fully optimized for desktop browsers. A streamlined mobile version is available, though we recommend using a desktop or laptop for detailed system configuration and analysis features.</p>

        {/* GETTING STARTED */}
        <h2 id="section2">Getting Started</h2>
        <p>Before diving into microgrid configurations and simulations, it's important to get set up with the tool. This section will guide you through the basics: creating an account, navigating the dashboard, and starting your first project. Whether you're a new or returning user, these steps ensure you can make the most of the platform from the very beginning.</p>

        <h3 id="section2a">Creating an Account &amp; Logging in</h3>

        <h4>Steps to Sign Up</h4>
        <p>To begin using the Microgrid Design Tool, go to the login page and select "Create Account." You'll be asked to enter your name, email address, and a secure password. Once you submit the form, a verification email will be sent to your inbox.</p>

        <h4>Email Verification</h4>
        <p>Click the link in the verification email to activate your account. If you don't see the email, check your spam or junk folder.</p>

        <h4>Logging in &amp; Password Resets</h4>
        <p>After verifying your email, return to the login page and enter your credentials to access the tool. If you forget your password, click "Forgot Password?" and follow the instructions in the reset email to create a new password.</p>

        <h4>Deleting Your Account</h4>
        <p>If you wish to permanently delete your account, go to the Account Settings section from your dashboard. At the bottom of the settings page, click "Delete Account" and confirm your choice. This action is irreversible and will remove all saved projects and user data associated with your account.</p>

        <h3 id="section2b">Navigating Dashboard</h3>

        <h4>Overview</h4>
        <p>Once logged in, the dashboard serves as your main hub. Here you can start new projects, manage saved ones, and access tutorials or example walkthroughs.</p>

        <h4>Key Icons + Their Functions</h4>
        <ul>
          <li><strong>New Project:</strong> Start designing a new microgrid</li>
          <li><strong>Edit:</strong> Modify an existing project</li>
          <li><strong>Duplicate:</strong> Make a copy of a project for comparison or reuse</li>
          <li><strong>Delete:</strong> Remove a project permanently</li>
        </ul>

        <h3 id="section2c">Starting a New Project</h3>

        <h4>Creating a Project</h4>
        <p>Click the "New Project" button to begin. You'll be prompted to enter a name and an optional description before starting configuration.</p>

        <h4>Naming and Saving Projects</h4>
        <p>Choose a clear, descriptive name to stay organized. The tool autosaves regularly, but you can also save manually using the save button in the toolbar.</p>

        <h4>Duplicating or Deleting Projects</h4>
        <p>To duplicate a project, click the copy icon in the dashboard. This is useful for testing different design scenarios. To delete a project, click the trash icon and confirm when prompted; this action is permanent.</p>

        {/* CONFIGURING A MICROGRID */}
        <h2 id="section3">Configuring a Microgrid</h2>
        <p>
          All microgrid configuration happens inside the <strong>Project Wizard</strong>, a step-by-step modal that
          opens when you create a new project or click the edit icon on an existing one. The wizard walks you through
          five components in simulation order: Solar, Battery, Wind, Generator, and Loads. You can skip any component
          that does not apply to your project.
        </p>

        <h3>Using the Tutorial</h3>
        <div class="guide-callout">
          <p>Two built-in help tools are available at the top-right of the wizard at all times:</p>
          <ul>
            <li>
              <strong>? (Help button):</strong> Opens a context-sensitive tip panel for whichever step you are
              currently on. The panel appears next to the relevant input field and closes when you click "Got it."
            </li>
            <li>
              <strong>Tutorial button:</strong> Launches a full step-by-step guided tour (9 steps) starting at the
              Solar screen. A spotlight highlights each input in turn, and a panel explains what to enter and why.
              Navigate with Previous / Next. Some steps require a valid value before you can advance. Click
              the × in the panel corner to exit the tour at any time.
            </li>
          </ul>
        </div>

        <h3 id="section3a">Defining energy loads</h3>
        <p>
          The <strong>Loads</strong> step (the final wizard screen) defines how much electricity your community or
          site consumes hour-by-hour across a typical day. An accurate load profile is the foundation of every
          simulation, as it determines how much generation and storage capacity you actually need.
        </p>

        <h4>Step 1: Choose a usage pattern</h4>
        <p>Select <strong>Residential</strong> or <strong>Commercial</strong> to set the shape of the daily curve:</p>
        <ul>
          <li><strong>Residential:</strong> Evening peak. Reflects typical homes and dwellings where demand rises after work hours.</li>
          <li><strong>Commercial:</strong> Daytime peak. Reflects offices, retail, and light industry where demand peaks during business hours.</li>
        </ul>

        <h4>Step 2: Choose a building size</h4>
        <p>After selecting a pattern, choose a size category to scale the peak load:</p>
        <ul>
          <li><strong>Small:</strong> roughly 0.5–1 kW peak</li>
          <li><strong>Medium:</strong> roughly 2–5 kW peak</li>
          <li><strong>Large:</strong> roughly 5–15+ kW peak</li>
        </ul>
        <p>
          Selecting a size automatically populates the four time-block values (Morning, Afternoon, Evening, Night)
          with representative averages. These are starting points; you can edit them freely.
        </p>

        <h4>Base load (always on)</h4>
        <p>
          Enter a minimum kW value drawn at all hours, for example a refrigerator, networking equipment, or
          standby power for medical devices. No time block can fall below this floor.
        </p>

        <h4>Step 3: Manual override</h4>
        <p>
          The <strong>Manual Override</strong> section shows a live 24-hour bar chart and a set of editable time
          blocks. Each block has a label, start/end hours, and a kW value. You can add blocks with
          <strong> + Add time block</strong> and delete any block with the × button. Overlapping ranges are
          allowed; the simulation uses the highest kW value at each overlapping hour. The chart updates live.
          Your block configuration is saved and restored exactly the next time you open the editor.
        </p>

        <h3 id="section3b">Selecting energy sources</h3>
        <p>
          Energy sources are configured in the first four wizard steps. Each follows the same structure: a primary
          input at the top, optional fine-tune controls in an expandable <strong>Fine Tune</strong> section, cost
          inputs, and Skip / Back / Next buttons.
        </p>

        <div class="guide-component-grid">
          <div class="guide-component-card">
            <h4>☀️ Solar</h4>
            <p>Enter the total array size in kW. Use the Small / Medium / Large preset buttons as a starting point. Fine Tune exposes loss factors:</p>
            <ul>
              <li><strong>Wiring:</strong> resistive DC cabling losses</li>
              <li><strong>Mismatch:</strong> panel-to-panel variation</li>
              <li><strong>Aging:</strong> annual degradation</li>
              <li><strong>Dust / soiling:</strong> surface contamination</li>
              <li><strong>Converter:</strong> inverter inefficiency</li>
            </ul>
          </div>
          <div class="guide-component-card">
            <h4>🔋 Battery</h4>
            <p>Choose chemistry first, as it sets cost-per-kWh defaults:</p>
            <ul>
              <li><strong>Lithium-Ion:</strong> longer cycle life, higher upfront cost</li>
              <li><strong>Lead-Acid:</strong> lower upfront cost, shorter lifespan</li>
            </ul>
            <p>Then enter storage capacity (kWh) and charge rate (kW). A common rule of thumb is 1–2 nights of base load.</p>
          </div>
          <div class="guide-component-card">
            <h4>💨 Wind</h4>
            <p>Enter nameplate capacity in kW if your site has wind resources. Fine Tune adds cut-in, rated, and cut-out speed controls. Wind is optional; click Skip if not applicable.</p>
          </div>
          <div class="guide-component-card">
            <h4>⚡ Generator</h4>
            <p>Enter backup diesel generator capacity in kW. The generator acts as last-resort power when renewables and battery cannot meet demand. Optional; click Skip if not applicable.</p>
          </div>
        </div>

        <h4>Cost inputs (Fine Tune on every component)</h4>
        <ul>
          <li><strong>Capital cost:</strong> upfront purchase and installation cost ($)</li>
          <li><strong>O&amp;M cost:</strong> annual operating and maintenance cost (% of capital or $/year)</li>
          <li><strong>Replacement cost:</strong> cost to replace at end of life (% of capital or $)</li>
          <li><strong>Lifespan:</strong> expected years before replacement</li>
          <li><strong>Fuel price:</strong> (Generator only) cost per litre of diesel</li>
        </ul>

        <h3 id="section3c">Set location and environmental data</h3>
        <p>
          Solar irradiance and wind speed data are sourced automatically from the
          <strong> National Solar Radiation Database (NSRDB)</strong> based on your project's geographic
          coordinates. No manual weather data entry is required.
        </p>
        <p>
          When creating a project, select the location on the map or enter coordinates. The tool retrieves
          hourly solar and wind resource data from the NSRDB Meteosat Prime Meridian (PSM v4) dataset.
          This dataset currently covers <strong>Africa only</strong>. Projects outside this region will
          not have valid environmental data.
        </p>
        <p>
          Retrieved values include: Global Horizontal Irradiance (GHI), Direct Normal Irradiance (DNI),
          Diffuse Horizontal Irradiance (DHI), Global Tilted Irradiance (GTI, calculated), Wind Speed,
          Air Temperature, and Solar Zenith Angle.
        </p>

        <h3 id="section3d">Simulation settings</h3>
        <p>
          The primary simulation inputs are the component configurations set in the wizard. Once all components
          are configured and the project is saved, the simulation runs automatically using 8,760 hourly data
          points (one full year) from the NSRDB for your location.
        </p>
        <p>
          There are currently no separate simulation settings beyond component sizing, costs, and the load
          profile. Future versions may add options such as load growth assumptions and multi-year projections.
        </p>

        {/* SIMULATION */}
        <h2 id="section4">Simulation</h2>
        <p>
          Once your project is configured, the simulation engine calculates how your microgrid would perform
          over a full year, hour by hour, using real solar and wind resource data combined with the load
          profile you defined.
        </p>

        <h3 id="section4a">How to start</h3>
        <p>
          The simulation runs automatically after you finish the Project Wizard and click <strong>Create Project</strong>.
          You do not need to trigger it manually. Once the project appears on your dashboard, click into it to
          view the results. Allow a few moments for the simulation to complete after first saving.
        </p>

        <h3 id="section4b">Returning after changes</h3>
        <p>
          If you edit a component's configuration after the initial run, for example increasing solar capacity
          or changing battery chemistry, the simulation will re-run automatically using the updated values.
          Open the project, make your changes in the wizard, save, and the results will refresh.
        </p>
        <p>
          To compare two configurations, use the <strong>Duplicate</strong> feature on the dashboard to copy
          your project before making changes. This lets you run both versions and compare outputs side by side.
        </p>

        <h3 id="section4c">API Information</h3>
        <p>The wind and solar data was retrieved using the National Solar Radiation Database. The API works for areas in Africa only. All of the values have been retrieved (Zenith Solar Angle, DNI, GHI, Wind Speed, Air Temperature, DHI) or calculated (GTI) using this database only, specifically the Meteosat Prime Meridian: PSM v4</p>

        {/* ANALYSIS */}
        <h2 id="section5">Analysis</h2>
        <p>
          After the simulation completes, the project view displays charts and metrics that describe how your
          microgrid performs across the year. Use these to evaluate whether your design meets the community's
          energy needs and to identify areas for improvement.
        </p>

        <h3 id="section5a">Visual Outputs</h3>
        <p>The results page includes interactive charts that visualise generation, storage, and load across time:</p>
        <ul>
          <li>
            <strong>24-hour average profile:</strong> the typical daily pattern of solar generation, wind
            generation, battery state of charge, generator use, and total load on a single chart.
          </li>
          <li>
            <strong>Monthly breakdown:</strong> performance aggregated by month, showing how seasonal
            variation in solar irradiance and wind speed affects generation throughout the year.
          </li>
          <li>
            <strong>Energy source mix:</strong> a chart showing what percentage of total energy demand was
            met by solar, wind, battery discharge, and generator across the year.
          </li>
        </ul>

        <h3 id="section5b">Energy Balances</h3>
        <p>The energy balance summarises the total energy flows across the simulated year:</p>
        <ul>
          <li><strong>Total generation (kWh):</strong> combined output from solar, wind, and generator</li>
          <li><strong>Total load served (kWh):</strong> demand successfully met by the system</li>
          <li><strong>Excess generation (kWh):</strong> energy produced but not consumed or stored (curtailed)</li>
          <li><strong>Unmet load (kWh):</strong> demand that could not be served due to insufficient generation or storage</li>
          <li><strong>Battery throughput (kWh):</strong> total energy cycled through the battery bank</li>
        </ul>
        <p>
          A well-balanced design has low unmet load and low excess generation. High excess suggests the system
          is oversized; high unmet load suggests more generation or storage is needed.
        </p>

        <h3 id="section5c">Reliability Metrics</h3>
        <ul>
          <li>
            <strong>Loss of Load Probability (LOLP):</strong> the fraction of hours in the year where demand
            could not be fully met. Typical design targets are below 1–5% depending on the application.
          </li>
          <li>
            <strong>Renewable fraction (%):</strong> the percentage of total load served by solar and wind
            rather than the diesel generator. Higher values mean lower fuel dependency.
          </li>
          <li>
            <strong>Generator runtime (hours/year):</strong> how many hours the backup generator operated.
            Reducing this reduces fuel costs and emissions.
          </li>
        </ul>
        <p>
          Use these metrics together when evaluating design trade-offs; adding battery capacity typically
          improves LOLP and renewable fraction but increases capital cost.
        </p>

        {/* COST & ECONOMIC ANALYSIS */}
        <h2 id="section6">Cost &amp; Economic Analysis</h2>
        <p>
          The cost analysis section breaks down the financial picture of your microgrid design over its expected
          lifespan, helping you understand upfront investment requirements and long-term operating costs.
        </p>

        <h3>Capital costs</h3>
        <p>
          The total capital cost is the sum of all component purchase and installation costs entered during
          wizard configuration. An estimated running total is shown on each component's header in the wizard
          so you can track the budget as you configure.
        </p>

        <h3>Levelised Cost of Energy (LCOE)</h3>
        <p>
          LCOE expresses the average cost to generate one kilowatt-hour of electricity over the system's
          lifetime, accounting for capital costs, operating and maintenance costs, replacement costs, and
          total energy produced. It is the standard metric for comparing different energy system configurations.
        </p>

        <h3>Net Present Value (NPV) and payback</h3>
        <p>
          The tool calculates the net present value of the microgrid investment versus a diesel-only baseline,
          and estimates the simple payback period: how many years until savings from reduced fuel consumption
          offset the upfront capital cost.
        </p>

        <h3>Component lifetime costs</h3>
        <p>
          Each component's total cost of ownership is shown individually, including the projected replacement
          cost at end of life. Battery banks typically have the shortest lifespan (8–15 years depending on
          chemistry) and therefore the highest replacement cost relative to initial investment.
        </p>

        {/* SAVING AND EXPORTING */}
        <h2 id="section7">Saving and Exporting</h2>

        <h3 id="section7a">Saving project progress</h3>
        <p>
          Projects are saved automatically to your account whenever you complete the wizard and click
          <strong> Create Project</strong>, or when you save changes after editing. You do not need to manually
          save after every input; the wizard holds your configuration in memory until you finish and confirm.
        </p>
        <p>
          To resume work on a saved project, log in and click the project card from your dashboard. All
          component configurations, load profiles, and simulation results are restored exactly as you left them.
        </p>

        <h3 id="section7b">Exporting to PDF/CSV</h3>
        <p>Once a simulation has completed, you can export results from the project view:</p>
        <ul>
          <li>
            <strong>PDF report:</strong> a formatted summary of the project configuration, energy balance,
            reliability metrics, and cost analysis suitable for sharing with stakeholders.
          </li>
          <li>
            <strong>CSV data export:</strong> the full 8,760-row hourly dataset including generation, load,
            battery state of charge, and generator output for each hour of the simulated year. Useful for
            further analysis in spreadsheet tools.
          </li>
        </ul>
        <p>Look for the export buttons in the results toolbar at the top of the project view.</p>

        {/* EXAMPLE PROJECT */}
        <h2 id="section8">Example Project</h2>
        <p>
          The following walkthrough demonstrates configuring a small residential microgrid for a rural community
          in sub-Saharan Africa. Use it as a reference when setting up your first project.
        </p>

        <div class="guide-callout">
          <p>
            <strong>Scenario:</strong> A village of 20 households with no grid connection. The community has
            good solar resources and wants to power lighting, phone charging, and a small health clinic with
            a refrigerator and basic medical equipment. A diesel generator is available as backup.
          </p>
        </div>

        <div class="guide-steps">
          <div class="guide-step-item">
            <div class="guide-step-num">1</div>
            <div class="guide-step-body">
              <strong>Solar: 8 kW array</strong>
              <p>Select the Medium preset and enter <strong>8 kW</strong>. Leave loss factors at defaults (wiring 2%, mismatch 2%, aging 0.5%/year, dust 3%, inverter 4%).</p>
            </div>
          </div>
          <div class="guide-step-item">
            <div class="guide-step-num">2</div>
            <div class="guide-step-body">
              <strong>Battery: 20 kWh Lithium-Ion</strong>
              <p>Choose <strong>Lithium-Ion</strong>. Enter <strong>20 kWh</strong> storage and <strong>5 kW</strong> charge rate, roughly 2 nights of base-load coverage.</p>
            </div>
          </div>
          <div class="guide-step-item">
            <div class="guide-step-num">3</div>
            <div class="guide-step-body">
              <strong>Wind: skip</strong>
              <p>The site has low wind resources. Click <strong>Skip</strong> to proceed without wind turbines.</p>
            </div>
          </div>
          <div class="guide-step-item">
            <div class="guide-step-num">4</div>
            <div class="guide-step-body">
              <strong>Generator: 5 kW diesel</strong>
              <p>Enter <strong>5 kW</strong> as backup for extended cloudy periods. Set fuel price to the local diesel cost per litre.</p>
            </div>
          </div>
          <div class="guide-step-item">
            <div class="guide-step-num">5</div>
            <div class="guide-step-body">
              <strong>Loads: Residential, Medium</strong>
              <p>Select <strong>Residential</strong> and <strong>Medium</strong>. Adjust the Evening block to ~3.5 kW for clinic loads. Set base load to <strong>0.5 kW</strong> for the refrigerator and standby equipment.</p>
            </div>
          </div>
        </div>

        <div class="guide-callout">
          <p>
            <strong>Expected results:</strong> With this configuration you should see a renewable fraction above
            85%, LOLP under 2%, and generator runtime under 200 hours per year. If unmet load is high,
            increase battery capacity or add more solar.
          </p>
        </div>

        <h2 id="section9">Troubleshooting &amp; FAQ</h2>

        <h3 id="section9a">Common Errors</h3>

        <div class="guide-faq">
          <div class="guide-faq-item">
            <h4>The tutorial Next button is greyed out</h4>
            <p>Some tutorial steps require a valid value before you can advance. Enter the requested value (for example, a solar size greater than zero, or a battery type selection) and the button will become active.</p>
          </div>
          <div class="guide-faq-item">
            <h4>I can't click the Residential / Commercial preset cards during the tutorial</h4>
            <p>Make sure the tutorial spotlight is highlighting the preset card area. If the wizard has scrolled and the spotlight appears in the wrong place, scroll back to the top and click the Tutorial button again to restart the tour from the Loads step.</p>
          </div>
          <div class="guide-faq-item">
            <h4>The simulation shows high unmet load</h4>
            <p>This usually means the system is undersized relative to the load profile. Try increasing solar capacity, adding battery storage, or reviewing the load profile to check if peak values are realistic. Use Duplicate to test different sizing scenarios side by side.</p>
          </div>
          <div class="guide-faq-item">
            <h4>My location has no solar or wind data</h4>
            <p>The NSRDB data source currently covers Africa only. Projects set to locations outside this region will not return valid resource data. Ensure your project location is within the supported geographic range.</p>
          </div>
          <div class="guide-faq-item">
            <h4>I accidentally closed the wizard before finishing</h4>
            <p>If you closed the wizard before clicking Create Project, the configuration has not been saved. Open a new project and re-enter your settings. If you had previously saved the project, re-open it from the dashboard; it will restore the last saved configuration.</p>
          </div>
          <div class="guide-faq-item">
            <h4>The bar chart in the Loads editor is not updating</h4>
            <p>The chart updates live as you edit time block values. If it appears frozen, try changing a block's kW value to trigger a refresh. If the chart remains blank, ensure at least one block has a value greater than zero.</p>
          </div>
        </div>

        <h3 id="section9b">Reporting bugs or feedback</h3>
        <p>
          If you encounter any bugs or have suggestions on how we can improve the Microgrid Toolkit, please visit our
          <a href="https://sesdc-toolkit.com/contact" target="_blank" rel="noopener">
            {' '}contact Form
          </a>
          {' '}and fill out the details. You can also click the "Contact" button in the navbar at any time to open the same form. We appreciate your input and review every submission.
        </p>
        <h3 id="section9c">Contact Support</h3>
        <p>
          For any other questions or assistance, please go to
          <a href="https://sesdc-toolkit.com/support-form" target="_blank" rel="noopener">
            {' '}our Support Page
          </a>
          {' '}and complete the form. Alternatively, you can click the "Contact" button in the navbar above to access the form. A member of our team will get back to you soon.
        </p>
      </div>

      <SESDCFooter />
    </div>
  )
}

export default UserGuide