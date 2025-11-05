import white_logo from '../media/Logo-white.svg'

function SESDCHeader() {
    return (
        <nav>
            <input type="checkbox" id="check" />
            <label htmlFor="check" class="check-btn">
            <i class="bx bx-menu"></i>
            </label>

            <div class="nav-left">
            <img src={white_logo} alt="Logo" class="nav-logo" />
            <label class="logo-nav">Microgrid Toolkit</label>
            </div>
        </nav>
    )
}

export default SESDCHeader
