import React from "react"
import { connector } from "../../actionCreators"
import { RootState } from "../../reducers"
import { Config } from "../pages/Config"
import { Edit } from "../pages/Edit"
import { Main } from "../pages/Main"
import { setActiveRepository } from "../../reducers/argit"
import { DIALOG_FOOTER_ACTIONS } from "@blueprintjs/core/lib/esm/common/classes"
import { lifecycle } from "recompose"
import {
  updateProjectList,
  createNewProject,
  loadProjectList
} from "../../reducers/project"
import { cloneRepository, createProject } from "../../../domain/git"
import {
  startProjectRootChanged,
  initializeGitStatus
} from "../../actionCreators/editorActions"
import * as EditorActions from "../../actionCreators/editorActions"

type CustomProps = {
  currentScene: string
  projectRoot: string
  setActiveRepository: typeof setActiveRepository
  match: any
  updateProjectList: typeof updateProjectList
  startProjectRootChanged: typeof startProjectRootChanged
  createNewProject: typeof createNewProject
  loadProjectList: typeof loadProjectList
}

// const selector = (state: RootState): Props => {
//   return {
//     currentScene: state.app.sceneStack[state.app.sceneStack.length - 1],
//     activeRepository: state.argit.activeRepository
//   }
// }

export const StackRouter = connector(
  state => ({
    currentScene: state.app.sceneStack[state.app.sceneStack.length - 1],
    projectRoot: state.project.projectRoot,
    setActiveRepository: state.argit.activeRepository
  }),
  actions => ({
    setActiveRepository: actions.argit.setActiveRepository,
    updateProjectList: actions.project.updateProjectList,
    startProjectRootChanged: actions.editor.startProjectRootChanged,
    createNewProject: actions.project.createNewProject,
    loadProjectList: actions.project.loadProjectList
  }),
  // lifecycle<CustomProps, {}>({
  //   componentDidUpdate(prevProps, prevState) {
  //     const { projectRoot, activeRepository, match, ...actions } = this.props
  //     console.log("here")
  //     if (activeRepository !== prevProps.activeRepository) {
  //       console.log(projectRoot)
  //       console.log(match)
  //       const activeRepository = match.params.repo_name
  //     }
  //   }
  // }),
  lifecycle<CustomProps, {}>({
    async componentDidMount() {
      const {
        match,
        setActiveRepository,
        updateProjectList,
        startProjectRootChanged,
        loadProjectList
      } = this.props
      const projectRoot = `/${match.params.repo_name}`
      setActiveRepository({ activeRepository: match.params.repo_name })
      const projects = [{ projectRoot: projectRoot }]

      // createNewProject({ newProjectRoot })
      // // TODO: fix it

      // await new Promise(r => setTimeout(r, 500))
      // loadProjectList({ projects })

      // await startProjectRootChanged({
      //   projectRoot: newProjectRoot
      // })
      await createProject(projectRoot)

      updateProjectList({ projects })
      await startProjectRootChanged({ projectRoot })
      console.log(typeof initializeGitStatus)
      await initializeGitStatus(projectRoot)
    }
  })
)(function StackRouterImpl(props) {
  switch (props.currentScene) {
    case "main": {
      return <Main />
    }
    case "edit": {
      return <Edit />
    }
    case "config": {
      return <Config />
    }
    default: {
      return <span>Route Error: No {props.currentScene}</span>
    }
  }
})
