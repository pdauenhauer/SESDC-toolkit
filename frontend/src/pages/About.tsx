import logo from '../media/Logo.svg'
import kwh_logo from '../media/kwh.png'
import IEEE_logo from '../media/IEEE.png'
import team_picture from '../media/team.png'
import SESDCHeader from '../components/SESDCHeader'
import SESDCFooter from '../components/SESDCFooter'

function About() {
    return (
        <div>
            {/* Header */}
            <SESDCHeader/>
            {/* About Container */}
            <div class="about-container">
                <h2 class="about-heading">About</h2>
                <section class="about-section">
                <img src={logo} alt="Section 1" class="about-img" />
                <div class="about-text">
                    <p>
                    The SESDC microgrid design tool simulates the net energy in an off-grid renewable energy system based on the productivity of a solar array and the load on the system.
                    In addition, it produces financial simulations and socioeconomic impacts. The simulation is designed to help entrepreneurs and investors plan the most efficient and
                    reliable small-scale renewable energy systems for developing communities.​ This website was designed with simplicity and user-friendliness as its top priorities.
                    It aims to be accessible to everyone, including those with no background in electrical engineering. Every section is laid out clearly, with easy-to-understand
                    language and intuitive navigation. Whether you're a beginner or just curious, the site welcomes all users equally. There’s no need for technical expertise to benefit
                    from the information provided. Ensuring that every visitor can confidently explore and understand the site’s purpose.​
                    </p>
                </div>
                </section>

                <section class="about-section">
                <img src={kwh_logo} alt="Section 2" class="about-img" />
                <div class="about-text">
                    <p>
                    KiloWatts for Humanity (KWH) is a nonprofit organization dedicated to ending energy poverty by providing renewable electricity access to underserved communities.
                    Since its founding in 2009, KWH has implemented energy kiosks in rural areas of Zambia and Kenya, delivering essential services such as lighting, refrigeration, and
                    phone charging. Each kiosk is custom designed to meet the specific needs of the community, and KWH partners with local and international organizations to ensure sustainability
                    through viable business models. By combining technical solutions with economic empowerment, KWH helps foster long-term positive impacts in the communities it serves.
                    </p>
                </div>
                </section>

                <section class="about-section">
                <img src={IEEE_logo} alt="Section 3" class="about-img" />
                <div class="about-text">
                    <p>
                    The Sustainable Energy Systems for Developing Communities (SESDC) is a working group within the IEEE Power and Energy Society focused on creating practical,
                    sustainable energy solutions for rural and underserved areas. SESDC promotes community-centered electrification by supporting projects that go beyond academic
                    research to deliver real-world applications. Through initiatives like panels, white papers, and collaborative projects, SESDC connects professionals dedicated
                    to expanding access to electricity in developing regions and advancing sustainable technologies for humanitarian benefit.
                    </p>
                </div>
                </section>

                <section class="about-section">
                <img src={team_picture} alt="Section 4" class="about-img" />
                <div class="about-text">
                    <p>
                    Seattle University Capstone students contributed to the development of the microgrid design tool by enhancing its functionality, usability, and scalability.
                    Building on a prior prototype, the students improved the user interface, expanded simulation features, and integrated backend systems to ensure the tool could
                    support dynamic energy, financial, and impact analysis. Working closely with, Peter Dauenhauer, PhD, and Daniel Nausner, PE, the team received guidance and
                    technical expertise to align the tool with real-world needs. Using technologies like Python, Firebase, and open-source libraries, the team created an accessible,
                    web-based platform that empowers non-technical users to design renewable energy systems.
                    </p>
                </div>
                </section>
            </div>

            {/* Footer */}
            <SESDCFooter/>
        </div>
    )
}

export default About