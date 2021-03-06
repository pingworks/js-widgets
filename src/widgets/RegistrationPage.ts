import {renderString as nunjucksRenderString} from 'nunjucks';
import transport from '../common/Transport';
import Formatter from '../formatters/plain/Formatter';
import IPlainObject from '../interfaces/IPlainObject';
import Event from '../models/Event';
import {ITemplates} from '../templates/ITemplates';
import Localisation from '../utils/Localisation';
import RegistrationForm from './blocks/RegistrationForm';
import RegistrationPageConfig from './config/RegistrationPageConfig';
import FormHelper from './helpers/FormHelper';
import getTemplate from './helpers/Templates';

/**
 * Logic for the registration form page
 */
export default class RegistrationPage extends RegistrationForm<RegistrationPageConfig> {

  /**
   * @param selector {string} JQuery selector
   * @param apiKey {string} API key
   * @param templates {ITemplates} Templates for widgets
   * @param loc {Localisation} Localisation instance
   * @param options {object} Configuration config
   */
  static plugin(selector: string, apiKey: string, templates: ITemplates, loc: Localisation, options: IPlainObject) {
    const $elems = $(selector);
    if (!$elems.length) {
      return;
    }

    const config = RegistrationPageConfig.create(options);
    if (!config) {
      return;
    }

    return $elems.each((index, el) => {
      const $element = $(el);
      let data = $element.data('wsb.widget.registration.form');

      if (!data) {
        data = new RegistrationPage(el, apiKey, templates, loc, config);
        $element.data('wsb.widget.registration.form', data);
      }
    });
  }

  protected readonly formatter: Formatter;
  private ticketId: string;

  /**
   * Creates a new registration page
   * @param selector {HTMLElement} JQuery selector
   * @param apiKey {string} API key
   * @param templates {ITemplates} Templates
   * @param loc {Localisation} Localisation instance
   * @param config {RegistrationPageConfig} Configuration config
   */
  protected constructor(selector: HTMLElement,
                        apiKey: string,
                        templates: ITemplates,
                        loc: Localisation,
                        config: RegistrationPageConfig) {
    super(selector, apiKey, templates, loc, config);
    this.formatter = new Formatter(loc);
    this.ticketId = '';
    let id: string = '';

    const self = this;

    window.location.search.substr(1).split('&').forEach((el) => {
      const param = el.split('=', 2);
      if (param.length === 2 && param[0] === 'id') {
        id = param[1];
      } else if (param.length === 2 && param[0] === 'ticket') {
        self.ticketId = param[1];
      }
    });
    this.init();
    this.loadContent(id);
  }

  /**
   * Updates key elements of the page
   */
  protected updateHTML() {
    this.updateTitle();
  }

  /**
   * Changes the title of the page
   */
  protected updateTitle() {
    document.title = this.event.title;
  }

  private init() {
    if (this.config.theme) {
      this.$root.addClass(this.config.theme);
    }
  }

  /**
   * Loads the event and renders the page
   * @param eventId {string}
   * @private
   */
  private loadContent(eventId: string) {
    const self = this;
    const url = this.getUrl(eventId);

    transport.get(url, {},
      (data: IPlainObject[]) => {
        self.event = new Event(data, self.config);
        self.renderRegistrationForm();
      });
  }

  private renderRegistrationForm() {
    const self = this;

    $.when(getTemplate(self.config)).done((template) => {
      self.updateHTML();
      const uniqueParams = {
        countries: self.getCountries(self.config),
        event: self.event,
        ticket: self.ticketId,
      };
      const params = Object.assign( uniqueParams, self.getTemplateParams());

      const content = template ?
        nunjucksRenderString(template, params) :
        self.templates.registrationPage.render(params);
      self.$root.html(content);
      self.successMessage = self.$root.find('#wsb-success');
      self.successMessage.hide();
      self.form = self.$root.find('#wsb-form');
      self.assignEvents();

      self.formHelper = new FormHelper(
        self.$root.find('[data-control]'),
        self.getErrorMessages());
    });
  }

  private getUrl(eventId: string) {
    return `events/${eventId}?api_key=${this.apiKey}&fields=trainer.rating&t=${this.getWidgetStats()}`;
  }
}
