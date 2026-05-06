import { useEffect, useState } from 'preact/hooks'
import logo from '../media/Logo.svg'
import kwh_logo from '../media/kwh.png'
import IEEE_logo from '../media/IEEE.png'
import team_picture from '../media/team.png'
import chevronLeftIcon from '../media/chevron-left.svg'
import chevronRightIcon from '../media/chevron-right.svg'
import squareArrowOutIcon from '../media/square-arrow-out-up-right.svg'
import closeIcon from '../media/x.svg'
import '../css/about.css'

type SlideshowImage = {
    src: string
    alt: string
    descriptionLabel: string
    description: string
}

const slideshowImages: SlideshowImage[] = [
    {
        src: team_picture,
        alt: 'SU capstone team photo',
        descriptionLabel: '2025 SU Capstone Team:',
        description: 'Peter Dauenhauer (Sponsor), Joshua Baron, Daniel Nausner (Faculty advisor)'
    }
]

function About() {
    const [currentSlide, setCurrentSlide] = useState(0)
    const [isFullscreenOpen, setIsFullscreenOpen] = useState(false)
    const currentImage = slideshowImages[currentSlide]

    const showPreviousSlide = () => {
        setCurrentSlide((prevSlide) => (prevSlide - 1 + slideshowImages.length) % slideshowImages.length)
    }

    const showNextSlide = () => {
        setCurrentSlide((prevSlide) => (prevSlide + 1) % slideshowImages.length)
    }

    const openFullscreen = () => setIsFullscreenOpen(true)
    const closeFullscreen = () => setIsFullscreenOpen(false)

    const renderContributorLink = (name: string, linkedin: string) => (
        <li>
            <a href={linkedin} target="_blank" rel="noreferrer">
                <span class="about-contributor-name">{name}</span>
                <img
                    src={squareArrowOutIcon}
                    alt=""
                    aria-hidden="true"
                    class="about-external-link-icon"
                />
            </a>
        </li>
    )

    useEffect(() => {
        if (!isFullscreenOpen) {
            return
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'ArrowLeft') {
                showPreviousSlide()
            } else if (event.key === 'ArrowRight') {
                showNextSlide()
            } else if (event.key === 'Escape') {
                closeFullscreen()
            }
        }

        document.body.style.overflow = 'hidden'
        window.addEventListener('keydown', handleKeyDown)

        return () => {
            document.body.style.overflow = ''
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [isFullscreenOpen])

    return (
        <div class="about-page">
            <main>
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
                        <div class="about-slideshow">
                            <button
                                type="button"
                                class="about-slideshow-btn"
                                aria-label="Previous image"
                                onClick={showPreviousSlide}
                            >
                                <img src={chevronLeftIcon} alt="" aria-hidden="true" class="about-slideshow-nav-icon" />
                            </button>
                            <button
                                type="button"
                                class="about-slideshow-image-btn"
                                aria-label="Open image fullscreen"
                                onClick={openFullscreen}
                            >
                                <img
                                    src={currentImage.src}
                                    alt={currentImage.alt}
                                    class="about-img"
                                />
                            </button>
                            <button
                                type="button"
                                class="about-slideshow-btn"
                                aria-label="Next image"
                                onClick={showNextSlide}
                            >
                                <img src={chevronRightIcon} alt="" aria-hidden="true" class="about-slideshow-nav-icon" />
                            </button>
                        </div>
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

                    <section class="about-contributors">
                        <h3 class="about-contributors-heading">Devlopers</h3>
                        <div class="about-contributors-years">
                            <div class="about-contributors-year-column about-contributors-year-column-2025">
                                <h4 class="about-contributors-year">2025</h4>
                                <ul class="about-contributors-list">
                                    {renderContributorLink('Joshua Baron', 'https://www.linkedin.com/in/joshbaron2025/')}
                                </ul>
                            </div>
                            <div class="about-contributors-year-column about-contributors-year-column-2026">
                                <h4 class="about-contributors-year">2026</h4>
                                <ul class="about-contributors-list">
                                    {renderContributorLink('Jackson Gibbs', 'https://www.linkedin.com/in/jackson-gibbs-sea206/')}
                                    {renderContributorLink('Bryan Kim', 'https://www.linkedin.com/in/bryankimchi/')}
                                    {renderContributorLink('Evan Mickens', 'https://www.linkedin.com/in/evanjmickens/')}
                                    {renderContributorLink('Victor Wong', 'https://www.linkedin.com/in/victorwong-/')}
                                </ul>
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            {isFullscreenOpen ? (
                <div
                    class="about-lightbox"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Team photo slideshow"
                    onClick={closeFullscreen}
                >
                    <button
                        type="button"
                        class="about-lightbox-btn about-lightbox-close"
                        aria-label="Close fullscreen slideshow"
                        onClick={(event) => {
                            event.stopPropagation()
                            closeFullscreen()
                        }}
                    >
                        <img src={closeIcon} alt="" aria-hidden="true" class="about-lightbox-close-icon" />
                    </button>

                    <button
                        type="button"
                        class="about-lightbox-btn about-lightbox-prev"
                        aria-label="Previous image"
                        onClick={(event) => {
                            event.stopPropagation()
                            showPreviousSlide()
                        }}
                    >
                        <img src={chevronLeftIcon} alt="" aria-hidden="true" class="about-lightbox-nav-icon" />
                    </button>

                    <img
                        src={currentImage.src}
                        alt={currentImage.alt}
                        class="about-lightbox-image"
                        onClick={(event) => event.stopPropagation()}
                    />
                    <p class="about-lightbox-description" onClick={(event) => event.stopPropagation()}>
                        <strong>{currentImage.descriptionLabel}</strong>{' '}
                        {currentImage.description}
                    </p>

                    <button
                        type="button"
                        class="about-lightbox-btn about-lightbox-next"
                        aria-label="Next image"
                        onClick={(event) => {
                            event.stopPropagation()
                            showNextSlide()
                        }}
                    >
                        <img src={chevronRightIcon} alt="" aria-hidden="true" class="about-lightbox-nav-icon" />
                    </button>
                </div>
            ) : null}
        </div>
    )
}

export default About;
