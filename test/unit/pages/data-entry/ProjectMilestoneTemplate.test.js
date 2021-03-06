const { expect, sinon } = require('test/unit/util/chai');
const { paths } = require('config');
const authentication = require('services/authentication');
const ProjectMilestoneTemplate = require('pages/data-entry/project-milestone-template/ProjectMilestoneTemplate');
const { METHOD_NOT_ALLOWED } = require('http-status-codes');
const moment = require('moment');
const FieldEntryGroup = require('models/fieldEntryGroup');
const Project = require('models/project');
const Milestone = require('models/milestone');
const xl = require('excel4node');

let page = {};
let res = {};
let req = {};

describe('pages/data-entry/project-milestone-template/ProjectMilestoneTemplate', () => {
  beforeEach(() => {
    res = { cookies: sinon.stub(), sendStatus: sinon.stub(), send: sinon.stub() };
    req = { cookies: [] };

    page = new ProjectMilestoneTemplate('some path', req, res);

    sinon.stub(authentication, 'protect').returns([]);
  });

  afterEach(() => {
    authentication.protect.restore();
  });

  describe('#middleware', () => {
    it('only admins are alowed to access this page', () => {
      expect(page.middleware).to.eql([
        ...authentication.protect(['uploader', 'administrator'])
      ]);

      sinon.assert.calledWith(authentication.protect, ['uploader', 'administrator']);
    });
  });

  describe('#url', () => {
    it('returns correct url', () => {
      expect(page.url).to.eql(paths.dataEntry.projectMilestoneTemplate);
    });
  });

  describe('#userFriendlyType', () => {
    const tests = {
      integer: 'Number',
      float: 'Number',
      date: 'Date',
      group: 'Drop down',
      boolean: 'Drop down',
      string: 'Free text'
    };

    for (let [key, value] of Object.entries(tests)) {
      it(`returns '${value}' message if ${key}`, () => {
        expect(page.userFriendlyType(key)).to.eql(value);
      });
    }
  });

  describe('#getRequest', () => {
    it('runs the createExcelTemplate function on get request', async () => {
      sinon.stub(page, 'createExcelTemplate');

      await page.getRequest(req, res);

      sinon.assert.calledWith(page.createExcelTemplate, req, res);
    });
  });

  describe('#postRequest', () => {
    it('sends METHOD_NOT_ALLOWED status', async () => {
      await page.postRequest(req, res);
      sinon.assert.calledWith(res.sendStatus, METHOD_NOT_ALLOWED);
    });
  });

  describe('#postRequest', () => {
    it('sends METHOD_NOT_ALLOWED status', async () => {
      await page.postRequest(req, res);
      sinon.assert.calledWith(res.sendStatus, METHOD_NOT_ALLOWED);
    });
  });

  describe('#excelDefaultStyles', () => {
    it('should return correct styles', () => {
      expect(page.excelDefaultStyles).to.eql({
        border: {
          left: {
            style: 'thin',
            color: '000000'
          },
          right: {
            style: 'thin',
            color: '000000'
          },
          top: {
            style: 'thin',
            color: '000000'
          },
          bottom: {
            style: 'thin',
            color: '000000'
          }
        },
        alignment: {
          horizontal: ['center'],
          vertical: ['top'],
          wrapText: true
        }
      });
    });
  });

  describe('cell creation', () => {
    let workbook = {};
    let sheet = {};
    let validationSheet = {};
    let group = {};

    beforeEach(() => {
      workbook = {
        createStyle: sinon.stub().returns('some style')
      };

      sheet = {
        cell: sinon.stub(),
        string: sinon.stub(),
        style: sinon.stub(),
        addDataValidation: sinon.stub(),
        number: sinon.stub(),
        date: sinon.stub()
      };
      sheet.cell.returns(sheet);
      sheet.string.returns(sheet);
      sheet.style.returns(sheet);
      sheet.date.returns(sheet);

      validationSheet = {
        cell: sinon.stub().returns({
          cells: [{ v: null }],
          string: sinon.stub()
        }),
        string: sinon.stub()
      };
      validationSheet.string.returns(validationSheet);

      const styleOptions = {
        color: '123',
        fill: '123'
      };

      group = {
        name: 'somename',
        config: {
          exportOptions: {
            group: styleOptions,
            header: styleOptions,
            description: styleOptions
          }
        }
      }
    });

    describe('#createGroupHeaderCell', () => {
      it('creates a group header cell', () => {
        page.createGroupHeaderCell(workbook, group, sheet, 1, 1, 2);

        sinon.assert.calledWith(workbook.createStyle, {
          border: page.excelDefaultStyles.border,
          alignment: page.excelDefaultStyles.alignment,
          font: {
            bold: true,
            italics: true,
            color: group.config.exportOptions.group.color,
            name: 'Arial',
            size: 10
          },
          fill: {
            type: 'pattern',
            patternType: 'solid',
            fgColor: group.config.exportOptions.group.fill
          }
        });

        sinon.assert.calledWith(sheet.cell, 1, 1, 1, 2, true);
        sinon.assert.calledWith(sheet.string, group.name);
        sinon.assert.calledWith(sheet.style, 'some style');
      });
    });

    describe('#createHeaderCell', () => {
      it('creates a header cell', () => {
        page.createHeaderCell(workbook, sheet, group.config.exportOptions.header, 1, 1, { importColumnName: 'some name' });

        sinon.assert.calledWith(workbook.createStyle, {
          border: page.excelDefaultStyles.border,
          alignment: page.excelDefaultStyles.alignment,
          font: {
            bold: true,
            color: group.config.exportOptions.header.color,
            name: 'Arial',
            size: 10
          },
          fill: {
            type: 'pattern',
            patternType: 'solid',
            fgColor: group.config.exportOptions.header.fill
          }
        });

        sinon.assert.calledWith(sheet.cell, 1, 1);
        sinon.assert.calledWith(sheet.string, 'some name');
        sinon.assert.calledWith(sheet.style, 'some style');
      });
    });

    describe('#createDescriptionCell', () => {
      it('creates a description cell', () => {
        page.createDescriptionCell(workbook, sheet, group.config.exportOptions.description, 1, 1, { description: 'some name' });

        sinon.assert.calledWith(workbook.createStyle, {
          border: page.excelDefaultStyles.border,
          alignment: page.excelDefaultStyles.alignment,
          font: {
            italics: true,
            color: group.config.exportOptions.description.color,
            name: 'Arial',
            size: 9
          },
          fill: {
            type: 'pattern',
            patternType: 'solid',
            fgColor: group.config.exportOptions.description.fill
          }
        });

        sinon.assert.calledWith(sheet.cell, 1, 1);
        sinon.assert.calledWith(sheet.string, 'some name');
        sinon.assert.calledWith(sheet.style, 'some style');
      });
    });

    describe('#createTypeCell', () => {
      it('creates a type cell', () => {
        page.createTypeCell(workbook, sheet, 1, 1, { type: 'string' });

        sinon.assert.calledWith(workbook.createStyle, {
          border: page.excelDefaultStyles.border,
          alignment: page.excelDefaultStyles.alignment,
          font: {
            bold: true,
            name: 'Arial',
            size: 10
          }
        });

        sinon.assert.calledWith(sheet.cell, 1, 1);
        sinon.assert.calledWith(sheet.string, '[Free text]');
        sinon.assert.calledWith(sheet.style, 'some style');
      });
    });

    describe('#addGroupValidation', () => {
      it('does nothing if type is not group or boolean', () => {
        page.addGroupValidation(workbook, validationSheet, sheet, 1, 1, { type: 'string' });

        sinon.assert.notCalled(sheet.addDataValidation);
      });

      it('adds drop down items for group items', () => {
        const field = {
          isRequired: true,
          type: 'group',
          config: {
            options: ['1', '2', '3']
          }
        }
        page.addGroupValidation(workbook, validationSheet, sheet, 1, 1, field);

        sinon.assert.calledWith(sheet.addDataValidation, {
          type: 'list',
          allowBlank: 1,
          sqref: 'A1:A1000',
          formulas: ["='FOR INFO drop down data'!$A$2:$A$4"]
        });
      });

      it('adds n/a to optional group field', () => {
        const field = {
          isRequired: false,
          type: 'group',
          config: { options: [] }
        }
        page.addGroupValidation(workbook, validationSheet, sheet, 1, 1, field);

        sinon.assert.calledWith(sheet.addDataValidation, {
          type: 'list',
          allowBlank: 1,
          sqref: 'A1:A1000',
          formulas: ["='FOR INFO drop down data'!$A$2:$A$2"]
        });
      });

      it('adds n/a to optional boolean field', () => {
        const field = {
          isRequired: false,
          type: 'boolean'
        }
        page.addGroupValidation(workbook, validationSheet, sheet, 1, 1, field);

        sinon.assert.calledWith(sheet.addDataValidation, {
          type: 'list',
          allowBlank: 1,
          sqref: 'A1:A1000',
          formulas: ["='FOR INFO drop down data'!$A$2:$A$4"]
        });
      });

      it('creates boolean fields', () => {
        const field = {
          isRequired: true,
          type: 'boolean'
        }
        page.addGroupValidation(workbook, validationSheet, sheet, 1, 1, field);

        sinon.assert.calledWith(sheet.addDataValidation, {
          type: 'list',
          allowBlank: 1,
          sqref: 'A1:A1000',
          formulas: ["='FOR INFO drop down data'!$A$2:$A$3"]
        });
      });
    });

    describe('#addItem', () => {
      let style = {};

      beforeEach(() => {
        style = {
          border: page.excelDefaultStyles.border,
          alignment: {
            wrapText: true,
            horizontal: ['left'],
            vertical: ['top']
          },
          font: {
            size: 10,
            name: 'Arial'
          }
        };
      });

      it('creates an item cell for a integer', () => {
        page.addItem(workbook, sheet, 1, 1, { isRequired: false, type: 'integer' }, 12);

        sinon.assert.calledWith(workbook.createStyle, style);

        sinon.assert.calledWith(sheet.cell, 1, 1);
        sinon.assert.calledWith(sheet.style, 'some style');

        sinon.assert.calledWith(sheet.number, 12);
      });

      it('creates an item cell for a float', () => {
        page.addItem(workbook, sheet, 1, 1, { isRequired: false, type: 'float' }, 12.3);

        sinon.assert.calledWith(workbook.createStyle, style);

        sinon.assert.calledWith(sheet.cell, 1, 1);
        sinon.assert.calledWith(sheet.style, 'some style');

        sinon.assert.calledWith(sheet.number, 12.3);
      });

      it('creates an item cell for a date', () => {
        page.addItem(workbook, sheet, 1, 1, { isRequired: false, type: 'date' }, '02/02/2010');

        sinon.assert.calledWith(workbook.createStyle, style);

        sinon.assert.calledWith(sheet.cell, 1, 1);
        sinon.assert.calledWith(sheet.style, 'some style');

        sinon.assert.calledWith(sheet.date, moment('02/02/2010', 'DD/MM/YYYY').toDate());
        sinon.assert.calledWith(sheet.style, { numberFormat: 'd/mm/yy' });
      });

      it('creates an item cell for a true boolean', () => {
        page.addItem(workbook, sheet, 1, 1, { isRequired: false, type: 'boolean' }, true);

        sinon.assert.calledWith(workbook.createStyle, style);

        sinon.assert.calledWith(sheet.cell, 1, 1);
        sinon.assert.calledWith(sheet.style, 'some style');

        sinon.assert.calledWith(sheet.string, 'Yes');
      });

      it('creates an item cell for a false boolean', () => {
        page.addItem(workbook, sheet, 1, 1, { isRequired: false, type: 'boolean' }, false);

        sinon.assert.calledWith(workbook.createStyle, style);

        sinon.assert.calledWith(sheet.cell, 1, 1);
        sinon.assert.calledWith(sheet.style, 'some style');

        sinon.assert.calledWith(sheet.string, 'No');
      });

      it('creates an item cell for a string', () => {
        page.addItem(workbook, sheet, 1, 1, { isRequired: false, type: 'string' }, 'some string');

        sinon.assert.calledWith(workbook.createStyle, style);

        sinon.assert.calledWith(sheet.cell, 1, 1);
        sinon.assert.calledWith(sheet.style, 'some style');

        sinon.assert.calledWith(sheet.string, 'some string');
      });

      it('doesnt set value if no value given', () => {
        page.addItem(workbook, sheet, 1, 1, { type: 'string' });

        sinon.assert.calledWith(workbook.createStyle, style);

        sinon.assert.calledWith(sheet.cell, 1, 1);
        sinon.assert.calledWith(sheet.style, 'some style');

        sinon.assert.notCalled(sheet.string);
      });
    });
  });

  describe('project sheet creation', () => {
    const projects = [{
      id: 1,
      fields: {
        get: sinon.stub()
      }
    }];

    const groups = [{
      name: 'somename',
      config: {
        exportOptions: {
          group: {},
          header: {},
          description: {}
        }
      }
    }];

    let workbook = {};
    let projectSheet = {};

    beforeEach(() => {
      page.req.user = {
        getProjects: sinon.stub().returns(projects)
      };

      FieldEntryGroup.findAll.returns(groups);

      Project.fieldDefintions.returns([{ group: 'somename' }]);

      projectSheet = {
        row: sinon.stub(),
        setHeight: sinon.stub(),
        setWidth: sinon.stub(),
        column: sinon.stub()
      };
      projectSheet.row.returns(projectSheet);
      projectSheet.column.returns(projectSheet);
      workbook.addWorksheet = sinon.stub().returns(projectSheet);

      sinon.stub(page, 'createGroupHeaderCell');
      sinon.stub(page, 'createHeaderCell');
      sinon.stub(page, 'createDescriptionCell');
      sinon.stub(page, 'createTypeCell');
      sinon.stub(page, 'addGroupValidation');
      sinon.stub(page, 'addItem');
    });

    it('creates project sheet', async () => {
      await page.createProjectSheet(workbook, projectSheet);

      sinon.assert.calledWith(projectSheet.row, 1);
      sinon.assert.calledWith(projectSheet.row, 2);
      sinon.assert.calledWith(projectSheet.row, 3);
      sinon.assert.calledWith(projectSheet.column, 1);

      sinon.assert.calledWith(projectSheet.setHeight, 28);
      sinon.assert.calledWith(projectSheet.setHeight, 70);
      sinon.assert.calledWith(projectSheet.setHeight, 234);
      sinon.assert.calledWith(projectSheet.setWidth, 15);

      sinon.assert.called(page.createGroupHeaderCell);
      sinon.assert.called(page.createHeaderCell);
      sinon.assert.called(page.createDescriptionCell);
      sinon.assert.called(page.createTypeCell);
      sinon.assert.called(page.addGroupValidation);
      sinon.assert.called(page.addItem);
    });
  });

  describe('milestone sheet creation', () => {
    const projects = [{
      id: 1,
      milestones: [{
        id: 1,
        fields: {
          get: sinon.stub()
        }
      }]
    }];

    let workbook = {};
    let milestoneSheet = {};

    beforeEach(() => {
      page.req.user = {
        getProjects: sinon.stub().returns(projects)
      };

      Milestone.fieldDefintions.returns([{ config: { exportOptions: {} } }]);

      milestoneSheet = {
        row: sinon.stub(),
        setHeight: sinon.stub(),
        setWidth: sinon.stub(),
        column: sinon.stub()
      };
      milestoneSheet.row.returns(milestoneSheet);
      milestoneSheet.column.returns(milestoneSheet);
      workbook.addWorksheet = sinon.stub().returns(milestoneSheet);

      sinon.stub(page, 'createGroupHeaderCell');
      sinon.stub(page, 'createHeaderCell');
      sinon.stub(page, 'createDescriptionCell');
      sinon.stub(page, 'createTypeCell');
      sinon.stub(page, 'addGroupValidation');
      sinon.stub(page, 'addItem');
    });

    it('creates milestone sheet', async () => {
      await page.createMilestoneSheet(workbook, milestoneSheet);

      sinon.assert.calledWith(milestoneSheet.row, 1);
      sinon.assert.calledWith(milestoneSheet.row, 2);
      sinon.assert.calledWith(milestoneSheet.column, 1);

      sinon.assert.calledWith(milestoneSheet.setHeight, 70);
      sinon.assert.calledWith(milestoneSheet.setHeight, 234);
      sinon.assert.calledWith(milestoneSheet.setWidth, 15);

      sinon.assert.called(page.createHeaderCell);
      sinon.assert.called(page.createDescriptionCell);
      sinon.assert.called(page.createTypeCell);
      sinon.assert.called(page.addGroupValidation);
      sinon.assert.called(page.addItem);
    });
  });

  describe('#createExcelTemplate', () => {
    let workbook = {};
    const sheet = 'sheet';

    beforeEach(() => {
      workbook = {
        write: sinon.stub(),
        addWorksheet: sinon.stub().returns(sheet)
      };

      sinon.stub(xl, 'Workbook').callsFake(() => workbook);

      sinon.stub(page, 'createProjectSheet');
      sinon.stub(page, 'createMilestoneSheet');
    });

    afterEach(() => {
      xl.Workbook.restore();
    });

    it('creates and writes excel file to res', async () => {
      await page.createExcelTemplate(req, res)

      sinon.assert.calledWith(page.createProjectSheet, workbook, sheet, sheet);
      sinon.assert.calledWith(page.createMilestoneSheet, workbook, sheet, sheet);

      const name = `OS_${moment().format('YYYY.MM.DD')}_Commission Sheet.xlsx`;
      sinon.assert.calledWith(workbook.write, name, res);
    })
  })
});
