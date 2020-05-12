const { Model, STRING, ENUM, DATE, INTEGER, BOOLEAN } = require('sequelize');
const sequelize = require('services/sequelize');
const Project = require('./project');
const Milestone = require('./milestone');
const ProjectFieldEntry = require('./projectFieldEntry');
const ProjectField = require('./projectField');
const MilestoneFieldEntry = require('./milestoneFieldEntry');
const MilestoneField = require('./milestoneField');
const Department = require('./department');
const DepartmentUser = require('./departmentUser');
const modelUtils = require('helpers/models');
const moment = require('moment');

class User extends Model {
  get isDepartmentalViewer () {
    return this.departments.length === 1 ? true : false;
  }

  async getProjects (search) {
    const departments = await this.getDepartmentsWithProjects(search);

    return departments.reduce((projects, department) => {
      projects.push(...department.get('projects'));
      return projects;
    }, []);
  }

  async getDepartmentsWithProjects (search) {
    const groupedSearch = await modelUtils.groupSearchItems(search);

    const milestoneSearchCriteria = [...Object.keys(groupedSearch.milestone), ...Object.keys(groupedSearch.milestoneField)];
    const projectsMustHaveMilestones = milestoneSearchCriteria.length ? true : false;

    const milestoneInclude = [{
      model: MilestoneFieldEntry,
      include: MilestoneField
    }];

    if (milestoneSearchCriteria.length) {
      milestoneInclude.push({
        model: MilestoneFieldEntry,
        required: true,
        as: 'MilestoneFieldEntryFilter',
        attributes: [],
        where: groupedSearch.milestoneField
      })
    }

    const include = [
      {
        model: Milestone,
        include: milestoneInclude,
        required: projectsMustHaveMilestones,
        where: groupedSearch.milestone
      },
      {
        model: ProjectFieldEntry,
        include: ProjectField
      }
    ];

    if (Object.keys(groupedSearch.projectField).length) {
      include.push({
        required: true,
        as: 'ProjectFieldEntryFilter',
        attributes: [],
        model: ProjectFieldEntry,
        where: groupedSearch.projectField
      })
    }

    const departmentsWithProjects = await this.getDepartments({
      include: [{
        model: Project,
        where: groupedSearch.project,
        required: true,
        include
      }]
    });

    // sort milestones inside projects
    departmentsWithProjects.forEach(departments => {
      departments.projects.forEach(projects => {
        projects.milestones = projects.milestones
          .sort((a, b) => moment(a.date, 'DD/MM/YYYY').valueOf() - moment(b.date, 'DD/MM/YYYY').valueOf());
      });
    });

    return departmentsWithProjects;
  }

  async getProject (projectUid) {
    const departments = await this.getDepartments({
      attributes: [],
      include: [{
        model: Project,
        where: {
          uid: projectUid
        },
        include: [
          {
            model: Milestone,
            include: [{
              model: MilestoneFieldEntry,
              include: MilestoneField
            }]
          },
          {
            model: ProjectFieldEntry,
            include: ProjectField
          }
        ]
      }]
    });

    const projects = departments.reduce((projects, department) => {
      projects.push(...department.get('projects'));
      return projects;
    }, []);

    return projects.length ? projects[0] : undefined;
  }

  async getProjectMilestone(milestoneUid) {
    const departments = await this.getDepartments({
      attributes: [],
      include: [{
        model: Project,
        include: [
          {
            model: Milestone,
            where: { uid: milestoneUid },
            include: [{
              model: MilestoneFieldEntry,
              include: MilestoneField
            }],
            required: true
          },
          {
            model: ProjectFieldEntry,
            include: ProjectField
          }
        ],
        required: true
      }]
    });

    const projects = departments.reduce((projects, department) => {
      projects.push(...department.get('projects'));
      return projects;
    }, []);

    if(!projects.length) {
      return {};
    }

    return {
      project: projects[0],
      milestone: projects[0].milestones[0]
    };
  }
}

User.init({
  id: {
    type: INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  email: STRING(64),
  hashedPassphrase: {
    type: STRING(128),
    field: "hashed_passphrase",
  },
  lastLoginAt: {
    type: DATE,
    field: "last_login_at"
  },
  role: {
    type: ENUM('uploader', 'viewer', 'administrator')
  },
  twofaSecret: {
    type: STRING(128),
    field: "twofa_secret"
  },
  loginAttempts: {
    type: INTEGER,
    field: "login_attempts"
  },
  passwordReset: {
    type: BOOLEAN,
    field: "must_change_password"
  }
}, { sequelize, modelName: 'user', tableName: 'user', timestamps: false });

User.belongsToMany(Department, { through: DepartmentUser, foreignKey: 'userId' });
Department.belongsToMany(User, { through: DepartmentUser, foreignKey: 'departmentName' });

module.exports = User;
