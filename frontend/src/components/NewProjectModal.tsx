function NewProjectModal() {
    return (
        <div class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <h1>New Project</h1>
            <form>
                <input type="text" placeholder="Project Name" />
                <input type="text" placeholder="Project Description" />
                <button type="submit">Create Project</button>
            </form>
        </div>
    );
}

export default NewProjectModal;